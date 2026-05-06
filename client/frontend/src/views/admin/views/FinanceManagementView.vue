<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title">
        <Wallet :size="24" class="title-icon" />
        Quản lý Tài chính & Hoàn tiền
        <span class="count">{{ pendingRefunds }} yêu cầu hoàn tiền</span>
      </div>
      <div class="page-subtitle">Theo dõi luồng tiền, đối soát giao dịch và xử lý các yêu cầu hoàn trả từ khách hàng</div>
    </div>

    <!-- Quick Stats -->
    <div class="finance-stats">
      <div class="f-stat-card primary">
        <div class="f-stat-label">Tổng doanh thu hệ thống</div>
        <div class="f-stat-value">{{ formatPrice(stats.totalRevenue) }}</div>
        <div class="f-stat-desc">Tổng các đơn thanh toán thành công</div>
      </div>
      <div class="f-stat-card success">
        <div class="f-stat-label">Số lượng giao dịch</div>
        <div class="f-stat-value">{{ stats.txCount }}</div>
        <div class="f-stat-desc">Bao gồm cả các đơn đang chờ</div>
      </div>
      <div class="f-stat-card warning">
        <div class="f-stat-label">Yêu cầu rút tiền</div>
        <div class="f-stat-value">{{ stats.pendingPayouts }}</div>
        <div class="f-stat-desc">Chủ sân đang chờ sàn chuyển tiền</div>
      </div>
    </div>

    <!-- Tabs & Table -->
    <div class="table-card">
      <div class="table-toolbar">
        <div class="tabs">
          <button 
            v-for="t in tabs" 
            :key="t.id" 
            class="tab-btn" 
            :class="{active: activeTab === t.id}"
            @click="activeTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>
        <div v-if="activeTab !== 'payout'" class="method-filter">
          <select v-model="methodFilter" class="method-select">
            <option value="ALL">Tất cả phương thức</option>
            <option value="CREDIT_CARD">Thẻ (Stripe)</option>
            <option value="VNPAY">VNPay</option>
            <option value="MOMO">MoMo</option>
          </select>
        </div>
        <div class="search-input ml-auto">
          <Search :size="14" />
          <input type="text" v-model="searchQuery" placeholder="Mã giao dịch, tên khách hàng..." />
        </div>
      </div>

      <!-- Payments Table -->
      <div v-if="activeTab !== 'payout'" class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Giao dịch</th>
              <th>Khách hàng / Sân</th>
              <th>Phương thức</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Ngày GD</th>
              <th class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredPayments" :key="p.id">
              <td>
                <div class="tx-cell">
                  <div class="tx-code">{{ p.transactionRef }}</div>
                  <div class="tx-sub">Booking: {{ p.bookingId }}</div>
                </div>
              </td>
              <td>
                <div class="user-cell">
                  <div class="user-name">{{ p.customerName }}</div>
                  <div class="tx-sub">{{ p.clubName }}</div>
                </div>
              </td>
              <td>
                <div class="method-pill" :class="String(p.method || '').toLowerCase()">{{ p.method || 'UNKNOWN' }}</div>
              </td>
              <td class="font-bold">{{ formatPrice(p.amount) }}</td>
              <td>
                <div class="status-badge" :class="p.status.toLowerCase()">
                   <div class="dot"></div>
                   {{ statusLabels[p.status] }}
                </div>
              </td>
              <td>{{ p.createdAt.split('T')[0] }}</td>
              <td>
                <div class="row-actions justify-end">
                  <button class="row-btn" title="Chi tiết">
                    <Eye :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payouts Table -->
      <div v-else class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>ID Yêu cầu</th>
              <th>Chủ sân / Ngân hàng</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in payoutRequests" :key="r.id">
              <td><span class="tx-code">#{{ r.id.slice(-6) }}</span></td>
              <td>
                <div class="user-cell">
                  <div class="user-name">{{ r.wallet?.ownerProfile?.user?.fullName }}</div>
                  <div class="tx-sub">{{ r.bankName }} - {{ r.bankAccountNum }}</div>
                </div>
              </td>
              <td class="font-bold text-danger">{{ formatPrice(r.amount) }}</td>
              <td>
                <div class="status-badge" :class="r.status.toLowerCase()">
                   <div class="dot"></div>
                   {{ r.status }}
                </div>
              </td>
              <td>{{ r.createdAt.split('T')[0] }}</td>
              <td>
                <div class="row-actions justify-end">
                  <button class="row-btn success" title="Xử lý rút tiền" @click="handlePayout(r)">
                    <Check :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payout Details Modal -->
    <div v-if="showPayoutModal" class="modal-overlay" @click="showPayoutModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Xử lý yêu cầu rút tiền #{{ selectedPayout?.id.slice(-6) }}</h3>
          <button class="close-btn" @click="showPayoutModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="payout-info-grid">
            <div class="info-item">
              <label>Chủ sân:</label>
              <span>{{ selectedPayout?.wallet?.ownerProfile?.user?.fullName }}</span>
            </div>
            <div class="info-item">
              <label>Số tiền rút:</label>
              <span class="amount-val">{{ formatPrice(selectedPayout?.amount) }}</span>
            </div>
          </div>
          
          <div class="bank-box mt-4">
            <div class="r-label">Thông tin ngân hàng thụ hưởng:</div>
            <div class="bank-details">
              <p><strong>Ngân hàng:</strong> {{ selectedPayout?.bankName }}</p>
              <p><strong>STK:</strong> {{ selectedPayout?.bankAccountNum }}</p>
              <p><strong>Chủ TK:</strong> {{ selectedPayout?.bankAccountName }}</p>
            </div>
          </div>

          <div class="input-group mt-4">
             <label>Ghi chú cho chủ sân (nếu có)</label>
             <textarea v-model="adminNote" class="form-input" placeholder="Ví dụ: Đã chuyển khoản qua Vietcombank..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="selectedPayout?.status === 'PENDING'" class="action-btn danger ghost" @click="processPayout('REJECTED')">Từ chối</button>
          <button v-if="selectedPayout?.status === 'PENDING'" class="action-btn success shadow" @click="processPayout('COMPLETED')">Xác nhận Đã chuyển tiền</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { 
  Wallet, Search, Undo2, Image, FileText, 
  Eye, Check, X, AlertCircle 
} from 'lucide-vue-next';

import { adminService } from '@/services/admin.service';

export default {
  name: 'FinanceManagementView',
  components: {
    Wallet, Search, Undo2, Image, FileText, Eye, X, Check
  },
  setup() {
    const activeTab = ref('all');
    const searchQuery = ref('');
    const methodFilter = ref('ALL');
    const showRefundModal = ref(false);
    const selectedPayment = ref(null);
    const refundAmount = ref(0);
    const refundNote = ref('');

    const tabs = [
      { id: 'all', label: 'Tất cả giao dịch' },
      { id: 'payout', label: 'Yêu cầu rút tiền' },
      { id: 'refund', label: 'Hoàn tiền' }
    ];

    const statusLabels = {
      CONFIRMED: 'Thành công',
      PENDING: 'Đang xử lý',
      CANCELLED: 'Đã hủy',
      REFUNDED: 'Đã hoàn tiền'
    };

    const refundLabels = {
      REQUESTED: 'Đang chờ',
      APPROVED: 'Đã duyệt',
      COMPLETED: 'Đã hoàn thành',
      REJECTED: 'Từ chối'
    };

    const payments = ref([]);
    const payoutRequests = ref([]);
    const stats = ref({ totalRevenue: 0, txCount: 0, pendingPayouts: 0 });

    const pendingRefunds = computed(() => payments.value.filter(p => p.refundStatus === 'REQUESTED').length);

    const filteredPayments = computed(() => {
      let filtered = payments.value;
      if (activeTab.value === 'refund') filtered = filtered.filter(p => p.refundStatus !== 'NONE');
      if (activeTab.value === 'success') filtered = filtered.filter(p => p.status === 'CONFIRMED');

      if (methodFilter.value && methodFilter.value !== 'ALL') {
        filtered = filtered.filter(p => p.method === methodFilter.value);
      }
      
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        filtered = filtered.filter(p =>
          String(p.transactionRef || '').toLowerCase().includes(q) ||
          String(p.customerName || '').toLowerCase().includes(q) ||
          String(p.clubName || '').toLowerCase().includes(q)
        );
      }
      return filtered;
    });

    const formatPrice = (value) => {
      const v = Number(value || 0);
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
    };

    // Refund handlers (TODO: wire to refund APIs if needed)
    const handleRefund = (payment) => {
      selectedPayment.value = payment;
      refundAmount.value = Number(payment?.refundAmount || payment?.amount || 0);
      refundNote.value = '';
      showRefundModal.value = true;
    };
    const approveRefundAction = async () => {
      alert('Chức năng hoàn tiền chưa được nối API.');
      showRefundModal.value = false;
    };
    const rejectRefundAction = async () => {
      alert('Chức năng hoàn tiền chưa được nối API.');
      showRefundModal.value = false;
    };

    // Data Fetching
    const fetchData = async () => {
      try {
        const [payRes, payReqRes] = await Promise.all([
          adminService.getAllPayments(),
          adminService.getPayoutRequests()
        ]);
        // Không hiển thị giao dịch CASH/BANK_TRANSFER trong UI Admin Finance
        // (CASH: thanh toán tại sân, BANK_TRANSFER: chuyển thẳng tới tài khoản CLB)
        payments.value = (payRes.data?.data || []).filter((p) => p.method !== 'CASH' && p.method !== 'BANK_TRANSFER');
        payoutRequests.value = payReqRes.data?.data || [];
        
        // Basic stats calc
        stats.value.totalRevenue = payments.value.reduce((s, p) => s + (p.status === 'CONFIRMED' ? p.amount : 0), 0);
        stats.value.txCount = payments.value.length;
        stats.value.pendingPayouts = payoutRequests.value.filter(r => r.status === 'PENDING').length;
      } catch (e) {
        console.error('Failed to fetch finance data:', e);
      }
    };

    fetchData();

    const showPayoutModal = ref(false);
    const selectedPayout = ref(null);
    const adminNote = ref('');

    const handlePayout = (p) => {
      selectedPayout.value = p;
      adminNote.value = '';
      showPayoutModal.value = true;
    };

    const processPayout = async (status) => {
      if (!confirm(`Bạn có chắc chắn chuyển trạng thái yêu cầu sang ${status}?`)) return;
      try {
        await adminService.processPayoutRequest({
          requestId: selectedPayout.value.id,
          status,
          adminNote: adminNote.value
        });
        showPayoutModal.value = false;
        fetchData();
      } catch (e) {
        alert('Lỗi xử lý yêu cầu rút tiền');
      }
    };

    return {
      activeTab, searchQuery, tabs, filteredPayments, payoutRequests,
      methodFilter,
      statusLabels, refundLabels, pendingRefunds, formatPrice,
      showRefundModal, selectedPayment, refundAmount, refundNote,
      handleRefund, approveRefundAction, rejectRefundAction,
      showPayoutModal, selectedPayout, adminNote, handlePayout, processPayout, stats
    };
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.title-icon {
  color: var(--accent);
}

.font-bold { font-weight: 700; }
.text-right { text-align: right; }
.ml-auto { margin-left: auto; }
.justify-end { justify-content: flex-end; }

.finance-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
.f-stat-card { border-radius: 12px; padding: 20px; border: 1px solid var(--border); background: var(--bg-secondary); }
.f-stat-card.primary { border-left: 4px solid var(--accent); }
.f-stat-card.success { border-left: 4px solid var(--green); }
.f-stat-card.warning { border-left: 4px solid var(--orange); }

.f-stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
.f-stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.f-stat-desc { font-size: 11px; color: var(--text-muted); }

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
}

.method-filter { display: flex; align-items: center; }
.method-select {
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  outline: none;
}
.method-select:focus { border-color: rgba(79,110,247,0.6); box-shadow: 0 0 0 3px rgba(79,110,247,0.14); }

.tabs {
  display: flex;
  gap: 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
}

.tab-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
.tab-btn.active { background: var(--bg-active); color: var(--text-primary); box-shadow: inset 0 0 0 1px var(--border-light); }

.search-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-muted);
  min-width: 280px;
}
.search-input input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  width: 100%;
  font-size: 13px;
}
.search-input input::placeholder { color: var(--text-muted); }

.table-responsive { overflow-x: auto; }

.row-actions { display: flex; gap: 8px; }
.row-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.row-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.row-btn.success { border-color: rgba(34,197,94,0.25); color: var(--green); }
.row-btn.success:hover { background: rgba(34,197,94,0.12); }

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}
.status-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }
.status-badge.confirmed { color: var(--green); border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.08); }
.status-badge.confirmed .dot { background: var(--green); }
.status-badge.pending { color: var(--orange); border-color: rgba(249,115,22,0.25); background: rgba(249,115,22,0.08); }
.status-badge.pending .dot { background: var(--orange); }
.status-badge.cancelled { color: var(--text-muted); }
.status-badge.rejected { color: var(--red); border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.08); }
.status-badge.rejected .dot { background: var(--red); }
.status-badge.completed { color: var(--green); border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.08); }
.status-badge.completed .dot { background: var(--green); }
.status-badge.approved { color: var(--accent); border-color: rgba(79,110,247,0.25); background: rgba(79,110,247,0.08); }
.status-badge.approved .dot { background: var(--accent); }

.text-danger { color: var(--red); }

.tx-cell { display: flex; flex-direction: column; }
.tx-code { font-weight: 600; color: var(--text-primary); font-family: monospace; font-size: 13.5px; }
.tx-sub { font-size: 11px; color: var(--text-muted); }

.user-name { font-weight: 500; font-size: 13.5px; }

.method-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-block; background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border); }
.method-pill.momo { color: #d82d8b; border-color: rgba(216,45,139,0.2); }
.method-pill.vnpay { color: #005baa; border-color: rgba(0,91,170,0.2); }

.refund-sub { font-size: 10.5px; margin-top: 4px; }
.refund-sub span.requested { color: var(--orange); font-weight: 600; }
.refund-sub span.completed { color: var(--green); font-weight: 600; }

/* Statuses */
.status-badge.confirmed { color: var(--green); } .status-badge.confirmed .dot { background: var(--green); }
.status-badge.refunded { color: var(--purple); } .status-badge.refunded .dot { background: var(--purple); }

/* Modal specific */
.refund-info-box { background: var(--bg-tertiary); padding: 12px; border-radius: 8px; border: 1px solid var(--border); }
.r-label { font-size: 11px; color: var(--text-muted); font-weight: 600; margin-bottom: 4px; }
.r-value { font-size: 13.5px; color: var(--text-primary); }

.form-input { width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--text-primary); font-size: 14px; outline: none; margin-top: 6px; }
.form-input:focus { border-color: var(--accent); }
.hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.mt-4 { margin-top: 16px; }

.action-btn.success.shadow { box-shadow: 0 4px 12px rgba(34,197,94,0.3); }

/* Payout Modal Styles */
.payout-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 8px; }
.info-item label { display: block; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
.info-item span { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.amount-val { color: var(--orange) !important; font-size: 18px !important; }

.bank-box { background: #fdf2f8; border: 1px solid #fbcfe8; padding: 16px; border-radius: 12px; }
.bank-details p { margin: 4px 0; font-size: 13.5px; color: #1e293b; }
.bank-details strong { color: #be185d; }

.status-badge.pending { color: var(--orange); } .status-badge.pending .dot { background: var(--orange); }
.status-badge.completed { color: var(--green); } .status-badge.completed .dot { background: var(--green); }
.status-badge.rejected { color: var(--red); } .status-badge.rejected .dot { background: var(--red); }
.status-badge.approved { color: var(--blue); } .status-badge.approved .dot { background: var(--blue); }

.text-danger { color: var(--red); }

/* Modal base */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 50;
}
.modal-content {
  width: min(720px, 100%);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 18px 60px rgba(0,0,0,0.45);
}
.modal-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.modal-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
}
.close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.modal-body { padding: 16px; }
.modal-footer {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 980px) {
  .finance-stats { grid-template-columns: 1fr; }
  .table-toolbar { flex-direction: column; align-items: stretch; }
  .search-input { min-width: 0; width: 100%; }
}
</style>
