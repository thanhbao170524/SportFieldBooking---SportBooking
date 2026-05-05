import { eventEmitter } from "@/lib/events";
import { notifyNewBooking, notifyBookingStatusChanged } from "@/infra/realtime/socket";
import { sendBookingConfirmationEmail, sendBookingWaitingPaymentEmail } from "@/infra/mail/mailer";
import { prisma } from "@/infra/db/prisma";
import { createNotification } from "@/modules/user/notification.service";
import { updateClubCustomerStats } from "@/modules/crm/club-customer.service";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  CREDIT_CARD: 'Thẻ tín dụng',
  MOMO: 'Ví MoMo',
  VNPAY: 'VNPay',
  CASH: 'Tiền mặt',
};

/**
 * Booking Event Listener
 * Connects domain events ('booking.created', 'booking.cancelled', etc.) 
 * to side effects like real-time notifications or email sending.
 * This keeps the business logic in the service completely agnostic of these triggers.
 */
export const initBookingListeners = () => {
  /**
   * Listen for new booking creation
   */
  eventEmitter.on('booking.created', async ({ clubId, booking, type }) => {
    // 1. Real-time Socket notification (cho Owner dashboard)
    if (clubId) {
      await notifyNewBooking(clubId, {
        clubId,
        booking,
        type: type || 'new-booking'
      });
    }

    // 2. Gửi email xác nhận/thông tin thanh toán dựa trên phương thức
    try {
      const fullBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          user: { select: { email: true } },
          club: { select: { name: true } },
          items: {
            include: {
              timeSlot: {
                include: { court: { select: { name: true } } }
              }
            }
          },
          payment: {
            select: {
              method: true,
              bankName: true,
              accountNumber: true,
              beneficiaryName: true,
              transferContent: true,
            },
          },
        }
      });

      const recipientEmail = fullBooking?.bookerEmail || fullBooking?.user?.email;

      if (fullBooking && recipientEmail) {
        console.log(`📧 Preparing email for booking ${fullBooking.bookingCode} to ${recipientEmail}`);
        const courtNames = [...new Set(
          fullBooking.items.map(item => item.timeSlot.court.name)
        )].join(', ');

        const slots = fullBooking.items.map(item => {
          const start = new Date(item.timeSlot.startTime);
          const end = new Date(item.timeSlot.endTime);
          return {
            date: start.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: `${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          };
        });

        const emailData = {
          bookingId: fullBooking.id,
          bookerName: fullBooking.bookerName || 'Khách hàng',
          bookerEmail: recipientEmail,
          bookingCode: fullBooking.bookingCode,
          clubName: fullBooking.club?.name || 'N/A',
          courtName: courtNames,
          slots,
          totalAmount: Number(fullBooking.totalAmount),
          discountAmount: Number(fullBooking.discountAmount),
          finalAmount: Number(fullBooking.finalAmount),
          paymentMethod: PAYMENT_METHOD_LABELS[fullBooking.payment?.method || ''] || fullBooking.payment?.method || 'N/A',
          transferBankName: fullBooking.payment?.bankName,
          transferAccountNumber: fullBooking.payment?.accountNumber,
          transferBeneficiaryName: fullBooking.payment?.beneficiaryName,
          transferContent: fullBooking.payment?.transferContent || fullBooking.bookingCode,
        };

        // Nếu là chuyển khoản, gửi hướng dẫn thanh toán.
        if (fullBooking.payment?.method === 'BANK_TRANSFER') {
           console.log(`⏳ Sending waiting payment email to ${recipientEmail}`);
           await sendBookingWaitingPaymentEmail(emailData);
        } else {
           // Với các phương thức khác (CASH, VNPAY, MOMO, CREDIT_CARD), gửi email xác nhận đã nhận đơn
           console.log(`✅ Sending booking confirmation/received email to ${recipientEmail}`);
           await sendBookingConfirmationEmail(emailData);
        }
      } else {
        console.warn(`⚠️ Could not send email for booking ${booking.id}: fullBooking or recipientEmail missing.`, { 
          hasFullBooking: !!fullBooking, 
          bookerEmail: fullBooking?.bookerEmail,
          userEmail: fullBooking?.user?.email 
        });
      }
      if (fullBooking) {
        // 3. Create DB Notification for user
        await createNotification({
          userId: fullBooking.userId,
          type: "BOOKING_REMINDER",
          title: "Đang chờ thanh toán",
          body: `Bạn có đơn đặt sân mới tại ${fullBooking.club?.name || 'N/A'}. Vui lòng thanh toán để hoàn tất.`,
          bookingId: fullBooking.id
        });

        // 4. Update CRM Statistics if already confirmed (manual booking)
        if (fullBooking.status === 'CONFIRMED' && fullBooking.clubId) {
          await updateClubCustomerStats(
            fullBooking.clubId,
            fullBooking.userId,
            Number(fullBooking.finalAmount)
          );
        }
      }
    } catch (error) {
      console.error('⚠️ Lỗi khi gửi email/notification khởi tạo booking:', error);
    }
  });

  /**
   * Listen for booking status changes
   */
  eventEmitter.on('booking.status_updated', async ({ clubId, booking, type }) => {
    // 1. Thông báo cho Owner dashboard (venue room)
    if (clubId) {
      await notifyNewBooking(clubId, {
        clubId,
        booking,
        type: type || 'booking-status-updated'
      });
    }

    // 2. Thông báo real-time cho khách hàng
    if (booking?.id) {
      notifyBookingStatusChanged(booking.id, {
        bookingId: booking.id,
        status: booking.status,
        type: type || 'booking-status-updated'
      });
    }

    // 3. Nếu trạng thái là CONFIRMED (thanh toán thành công) → Gửi email hóa đơn & DB Notification & Update CRM Stats
    if (booking?.status === 'CONFIRMED') {
      try {
        await sendInvoice(booking.id);
        await createNotification({
          userId: booking.userId,
          type: "BOOKING_CONFIRMED",
          title: "Đặt sân thành công",
          body: `Đơn đặt sân ${booking.bookingCode} của bạn đã được xác nhận thành công.`,
          bookingId: booking.id
        });

        // Update CRM Statistics
        if (booking.clubId) {
          await updateClubCustomerStats(
            booking.clubId,
            booking.userId,
            Number(booking.finalAmount)
          );
        }
      } catch (err) {
        console.error('⚠️ Lỗi khi gửi hóa đơn/notification/CRM update:', err);
      }
    }
  });

  /**
   * Listen for cancellations
   */
  eventEmitter.on('booking.cancelled', async ({ clubId, booking }) => {
      if (clubId) {
        await notifyNewBooking(clubId, {
          clubId,
          booking,
          type: 'booking-cancelled'
        });
      }
  });
};

/**
 * Hàm hỗ trợ gửi email hóa đơn
 */
async function sendInvoice(bookingId: string) {
  const fullBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true } },
      club: { select: { name: true } },
      items: {
        include: {
          timeSlot: {
            include: { court: { select: { name: true } } }
          }
        }
      },
      payment: { select: { method: true } }
    }
  });

  const recipientEmail = fullBooking?.bookerEmail || fullBooking?.user?.email;

  if (fullBooking && recipientEmail) {
    console.log(`📧 Sending invoice for booking ${fullBooking.bookingCode} to ${recipientEmail}`);
    const courtNames = [...new Set(
      fullBooking.items.map(item => item.timeSlot.court.name)
    )].join(', ');

    const slots = fullBooking.items.map(item => {
      const start = new Date(item.timeSlot.startTime);
      const end = new Date(item.timeSlot.endTime);
      return {
        date: start.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: `${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      };
    });

    await sendBookingConfirmationEmail({
      bookingId: fullBooking.id,
      bookerName: fullBooking.bookerName || 'Khách hàng',
      bookerEmail: recipientEmail,
      bookingCode: fullBooking.bookingCode,
      clubName: fullBooking.club?.name || 'N/A',
      courtName: courtNames,
      slots,
      totalAmount: Number(fullBooking.totalAmount),
      discountAmount: Number(fullBooking.discountAmount),
      finalAmount: Number(fullBooking.finalAmount),
      paymentMethod: PAYMENT_METHOD_LABELS[fullBooking.payment?.method || ''] || fullBooking.payment?.method || 'N/A',
    });
  }
}
