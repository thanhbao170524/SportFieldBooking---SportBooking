<template>
  <div class="settings-view">
    <div class="view-header">
      <div class="header-info">
        <h1 class="view-title">Quản lý thanh toán</h1>
      </div>
      <div class="header-actions">
        <button class="btn-outline" @click="refreshAll" :disabled="saving">
          <span class="material-icons">refresh</span>
          <span>Làm mới</span>
        </button>
        <button class="save-btn" @click="saveChanges" :disabled="saving">
          <span class="material-icons">{{ saving ? 'hourglass_top' : 'save' }}</span>
          <span>{{ saving ? 'Đang lưu...' : 'Lưu thay đổi' }}</span>
        </button>
      </div>
    </div>

    <div class="tabs-row">
      <button class="tab-btn" :class="{ active: activeTab === 'config' }" @click="setTab('config')">
        <span class="material-icons">tune</span>
        Cấu hình
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'list' }" @click="setTab('list')">
        <span class="material-icons">receipt_long</span>
        Danh sách thanh toán
      </button>
      <div class="tab-meta">
        <span v-if="savedAt" class="muted">Đã lưu lúc {{ fmtTimeOnly(savedAt) }}</span>
      </div>
    </div>

    <div v-if="stripeBanner" class="stripe-banner" :class="stripeBanner.type">
      <div class="stripe-banner-left">
        <span class="material-icons">{{ stripeBanner.icon }}</span>
        <div class="stripe-banner-text">
          <div class="stripe-banner-title">{{ stripeBanner.title }}</div>
          <div class="stripe-banner-body">{{ stripeBanner.body }}</div>
        </div>
      </div>
      <button class="banner-close" @click="stripeBanner = null" aria-label="Close">×</button>
    </div>

    <!-- Tab: Config -->
    <div v-if="activeTab === 'config'" class="tab-pane fade-in">
      <div class="pane-header">
        <h3>Phương thức thanh toán</h3>
      </div>

      <div class="config-grid">
        <div class="card config-card">
          <div class="card-top">
            <div class="card-top-left">
              <h5 class="payment-section-title">
                <span class="material-icons">credit_card</span> Thẻ quốc tế (Stripe)
              </h5>
            </div>
            <div class="card-top-right">
              <span class="status-pill" :class="stripeEnabled ? 'ok' : 'off'">
                <span class="dot"></span>
                {{ stripeEnabled ? 'Đang bật' : 'Đang tắt' }}
              </span>
            </div>
          </div>

          <div class="stripe-actions">
            <button class="save-btn" type="button" @click="startStripeConnect" :disabled="stripeConnect.loading">
              <span class="material-icons">{{ stripeConnect.loading ? 'hourglass_top' : 'link' }}</span>
              <span>{{ stripeConnect.connected ? 'Quản lý Stripe' : 'Kết nối Stripe' }}</span>
            </button>
            <button v-if="stripeConnect.connected" class="btn-outline" type="button" @click="disconnectStripe" :disabled="stripeConnect.loading">
              <span class="material-icons">link_off</span>
              <span>Ngắt liên kết</span>
            </button>
            <div class="stripe-meta">
              <div v-if="stripeConnect.connected && stripeConnect.details" class="stripe-badges">
                <span class="mini-pill" :class="stripeConnect.details.charges_enabled ? 'ok' : 'warn'">
                  {{ stripeConnect.details.charges_enabled ? 'Charge OK' : 'Charge chưa bật' }}
                </span>
                <span class="mini-pill" :class="stripeConnect.details.payouts_enabled ? 'ok' : 'warn'">
                  {{ stripeConnect.details.payouts_enabled ? 'Payout OK' : 'Payout chưa bật' }}
                </span>
              </div>
              <div v-else class="muted">
                Chưa kết nối thì thanh toán thẻ sẽ không hiển thị ở Checkout.
              </div>
            </div>
          </div>

          <details class="advanced-box">
            <summary>Thiết lập nâng cao</summary>
            <div class="form-grid" style="margin-top:10px">
              <div class="form-group full-width">
                <label>Connected Account ID (thủ công)</label>
                <input type="text" v-model="stripeConnectAccountId" placeholder="acct_..." />
                <span v-if="stripeConnectAccountId && !String(stripeConnectAccountId).trim().startsWith('acct_')" class="error-text">
                  ID không hợp lệ. Ví dụ đúng: <code>acct_123...</code>
                </span>
              </div>
            </div>
          </details>
        </div>

        <div class="card config-card">
          <div class="card-top">
            <div class="card-top-left">
              <h5 class="payment-section-title">
                <span class="material-icons">payments</span>
                Thiết lập ngân hàng / số tài khoản / chủ tài khoản cho Checkout.
              </h5>
            </div>
            <div class="card-top-right">
              <span class="muted">{{ ownerClubs.length }} CLB</span>
            </div>
          </div>

          <div v-if="!ownerClubs.length" class="transfer-empty card-alt">
            <span class="material-icons">domain_disabled</span>
            <p>Bạn chưa có câu lạc bộ. Tạo câu lạc bộ trước, sau đó cấu hình chuyển khoản tại đây.</p>
          </div>

          <template v-else>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Câu lạc bộ</label>
                <select v-model="transferClubId" @change="syncClubTransferFromList">
                  <option v-for="c in ownerClubs" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>

            <div v-if="ownerClubs.length > 1" class="form-group full-width transfer-apply-all-wrap">
              <label class="transfer-apply-all-label">
                <input type="checkbox" v-model="applyTransferToAllClubs" />
                <span>Áp dụng thông tin CK này cho <strong>tất cả</strong> câu lạc bộ khi lưu</span>
              </label>
          <p v-if="applyTransferToAllClubs" class="transfer-hint">Sẽ ghi đè cấu hình chuyển khoản của các CLB khác.</p>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Ngân hàng</label>
                <input type="text" v-model="clubTransfer.transferBankName" :class="{ 'is-invalid-pay': transferErrors.bankName }" placeholder="Ví dụ: Vietcombank" @input="validateTransferField('bankName')" />
                <span v-if="transferErrors.bankName" class="error-text-pay">{{ transferErrors.bankName }}</span>
              </div>
              <div class="form-group">
                <label>Số tài khoản</label>
                <input type="text" v-model="clubTransfer.transferAccountNumber" :class="{ 'is-invalid-pay': transferErrors.accountNumber }" placeholder="Số TK nhận tiền" @input="onAccountNumberInput" />
                <span v-if="transferErrors.accountNumber" class="error-text-pay">{{ transferErrors.accountNumber }}</span>
              </div>
              <div class="form-group full-width">
                <label>Chủ tài khoản</label>
                <input type="text" v-model="clubTransfer.transferBeneficiaryName" :class="{ 'is-invalid-pay': transferErrors.beneficiaryName }" placeholder="Họ tên chủ TK" @input="validateTransferField('beneficiaryName')" />
                <span v-if="transferErrors.beneficiaryName" class="error-text-pay">{{ transferErrors.beneficiaryName }}</span>
              </div>
            </div>

            <div class="form-group full-width transfer-qr-block">
              <label>Ảnh mã QR (tuỳ chọn)</label>
              <input
                type="url"
                v-model="clubTransfer.transferQrImageUrl"
                class="transfer-qr-url"
                placeholder="https://... hoặc tải ảnh bên dưới"
              />
              <div class="transfer-qr-row">
                <div
                  class="transfer-qr-preview"
                  :class="{ uploading: uploadingTransferQr }"
                  @click="$refs.transferQrInput.click()"
                >
                  <img
                    v-if="clubTransfer.transferQrImageUrl"
                    :src="clubTransfer.transferQrImageUrl"
                    alt="QR"
                  />
                  <template v-else>
                    <span class="material-icons">qr_code_2</span>
                    <span>Nhấn để tải ảnh QR</span>
                  </template>
                </div>
                <button type="button" class="btn-outline transfer-qr-btn" @click="$refs.transferQrInput.click()" :disabled="uploadingTransferQr || !transferClubId">
                  <span class="material-icons">upload</span>
                  {{ uploadingTransferQr ? 'Đang tải...' : 'Tải ảnh QR' }}
                </button>
                <input
                  ref="transferQrInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style="display:none"
                  @change="onTransferQrFile"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Tab: Payments list -->
    <div v-else class="tab-pane fade-in card">
      <div class="pane-header">
        <h3>Danh sách thanh toán</h3>
        <p>Lọc theo phương thức, trạng thái và thời gian.</p>
      </div>

      <div class="summary-row">
        <div class="summary-item">
          <span class="muted">Số giao dịch</span>
          <div class="summary-val">{{ paymentsSummary.count }}</div>
        </div>
        <div class="summary-item">
          <span class="muted">Tổng tiền</span>
          <div class="summary-val">{{ formatVnd(paymentsSummary.totalAmount) }}</div>
        </div>
        <div class="summary-item">
          <span class="muted">Thành công</span>
          <div class="summary-val">{{ paymentsSummary.confirmed }}</div>
        </div>
        <div class="summary-item">
          <span class="muted">Chờ xử lý</span>
          <div class="summary-val">{{ paymentsSummary.pending }}</div>
        </div>
      </div>

      <div class="filters">
        <div class="filter">
          <label>CLB</label>
          <select v-model="filters.clubId">
            <option value="">Tất cả</option>
            <option v-for="c in ownerClubs" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="filter">
          <label>Phương thức</label>
          <select v-model="filters.method">
            <option value="">Tất cả</option>
            <option value="CREDIT_CARD">Thẻ (Stripe)</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
            <option value="CASH">Tiền mặt</option>
          </select>
        </div>
        <div class="filter">
          <label>Trạng thái</label>
          <select v-model="filters.status">
            <option value="">Tất cả</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="WAITING_PAYMENT">WAITING_PAYMENT</option>
            <option value="PENDING">PENDING</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
        <div class="filter">
          <label>Từ ngày</label>
          <input type="date" v-model="filters.from" />
        </div>
        <div class="filter">
          <label>Đến ngày</label>
          <input type="date" v-model="filters.to" />
        </div>
        <div class="filter grow">
          <label>Tìm kiếm</label>
          <input type="text" v-model="filters.q" placeholder="Mã booking, transactionRef, tên khách, CLB..." />
        </div>

        <div class="filter actions">
          <button class="btn-outline" @click="resetFilters">Đặt lại</button>
          <button class="save-btn" @click="fetchPayments">Lọc</button>
        </div>
      </div>

      <div v-if="paymentsLoading" class="loading-box">Đang tải...</div>
      <div v-else-if="paymentsError" class="error-box">{{ paymentsError }}</div>

      <div v-else class="table-wrap">
        <table class="pay-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>CLB</th>
              <th>Mã đơn</th>
              <th>Phương thức</th>
              <th>Trạng thái</th>
              <th class="right">Số tiền</th>
              <th>Transaction</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in payments" :key="p.id">
              <td>{{ fmtDateTime(p.createdAt) }}</td>
              <td>{{ p.clubName || '—' }}</td>
              <td>{{ p.bookingCode || '—' }}</td>
              <td><span class="pill method" :class="p.method">{{ methodLabel(p.method) }}</span></td>
              <td><span class="pill status" :class="p.status.toLowerCase()">{{ statusLabel(p.status) }}</span></td>
              <td class="right strong">{{ formatVnd(p.amount) }}</td>
              <td class="mono">{{ p.transactionRef }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="payments.length === 0" class="empty-table">Không có dữ liệu phù hợp bộ lọc.</div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/api/axios';
import { clubService } from '@/services/club.service';
import { ownerPaymentsService } from '@/services/ownerPayments.service';
import { stripeConnectService } from '@/services/stripeConnect.service';

const TRANSFER_QR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TRANSFER_QR_MAX = 5 * 1024 * 1024;

export default {
  name: 'OwnerPaymentManagementView',
  data() {
    return {
      activeTab: 'config',
      stripeConnectAccountId: '',
      stripeConnect: {
        loading: false,
        connected: false,
        details: null,
      },
      stripeBanner: null,
      ownerClubs: [],
      transferClubId: null,
      clubTransfer: {
        transferBankName: '',
        transferAccountNumber: '',
        transferBeneficiaryName: '',
        transferQrImageUrl: '',
      },
      transferErrors: {
        bankName: '',
        accountNumber: '',
        beneficiaryName: ''
      },
      uploadingTransferQr: false,
      applyTransferToAllClubs: false,
      saving: false,
      savedAt: null,

      paymentsLoading: false,
      paymentsError: '',
      payments: [],
      filters: {
        clubId: '',
        method: '',
        status: '',
        from: '',
        to: '',
        q: '',
      },
    };
  },
  computed: {
    stripeEnabled() {
      const raw = String(this.stripeConnectAccountId || '').trim();
      return !!raw && raw.startsWith('acct_');
    },
    paymentsSummary() {
      const list = Array.isArray(this.payments) ? this.payments : [];
      const totalAmount = list.reduce((s, x) => s + Number(x.amount || 0), 0);
      const confirmed = list.filter((x) => x.status === 'CONFIRMED').length;
      const pending = list.filter((x) => x.status && x.status !== 'CONFIRMED').length;
      return { count: list.length, totalAmount, confirmed, pending };
    }
  },
  mounted() {
    this.loadProfile();
    this.loadStripeConnectStatus();
    this.loadOwnerClubs();
    this.handleStripeConnectReturn();
  },
  methods: {
    setTab(tab) {
      this.activeTab = tab;
      if (tab === 'list' && !this.paymentsLoading && this.payments.length === 0) {
        this.fetchPayments();
      }
    },
    async loadProfile() {
      try {
        const res = await userService.getProfile();
        const data = res.data?.data || {};
        this.stripeConnectAccountId = data.ownerProfile?.stripeConnectAccountId || '';
      } catch (e) {
        console.warn('loadProfile(payment)', e?.response?.status);
      }
    },
    validateTransferField(field) {
      const val = String(this.clubTransfer[field] || '').trim();
      const nameRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ]+$/;

      switch (field) {
        case 'bankName':
          if (!val) this.transferErrors.bankName = 'Vui lòng nhập tên ngân hàng';
          else if (!nameRegex.test(val)) this.transferErrors.bankName = 'Tên ngân hàng không hợp lệ';
          else this.transferErrors.bankName = '';
          break;
        case 'accountNumber':
          if (!val) this.transferErrors.accountNumber = 'Vui lòng nhập số tài khoản';
          else if (!/^\d+$/.test(val)) this.transferErrors.accountNumber = 'Số tài khoản chỉ chứa chữ số';
          else if (val.length < 6) this.transferErrors.accountNumber = 'Số tài khoản quá ngắn';
          else this.transferErrors.accountNumber = '';
          break;
        case 'beneficiaryName':
          if (!val) this.transferErrors.beneficiaryName = 'Vui lòng nhập chủ tài khoản';
          else if (!nameRegex.test(val)) this.transferErrors.beneficiaryName = 'Chủ tài khoản không hợp lệ';
          else this.transferErrors.beneficiaryName = '';
          break;
      }
    },
    onAccountNumberInput(e) {
      const val = e.target.value.replace(/[^0-9]/g, '');
      this.clubTransfer.transferAccountNumber = val;
      this.validateTransferField('accountNumber');
    },
    async loadStripeConnectStatus() {
      this.stripeConnect.loading = true;
      try {
        const res = await stripeConnectService.status();
        const d = res.data?.data || {};
        this.stripeConnect.connected = !!d.connected;
        this.stripeConnect.details = d.details || null;
        if (d.accountId && !this.stripeConnectAccountId) {
          this.stripeConnectAccountId = d.accountId;
        }
      } catch (e) {
        // silent: stripe may not be configured in dev
      } finally {
        this.stripeConnect.loading = false;
      }
    },
    async handleStripeConnectReturn() {
      const mode = this.$route?.query?.stripeConnect;
      if (mode !== 'return' && mode !== 'refresh') return;

      this.setTab('config');
      await this.loadStripeConnectStatus();

      const details = this.stripeConnect.details;
      if (mode === 'refresh') {
        this.stripeBanner = {
          type: 'warn',
          icon: 'info',
          title: 'Chưa hoàn tất kết nối Stripe',
          body: 'Bạn có thể bấm “Kết nối Stripe” để tiếp tục quá trình xác minh và thiết lập nhận tiền.',
        };
      } else if (this.stripeConnect.connected && details?.charges_enabled) {
        this.stripeBanner = {
          type: 'ok',
          icon: 'check_circle',
          title: 'Kết nối Stripe thành công',
          body: 'Thanh toán thẻ đã sẵn sàng. Khách hàng có thể chọn “Thẻ (Stripe)” khi đặt sân.',
        };
      } else if (this.stripeConnect.connected) {
        this.stripeBanner = {
          type: 'warn',
          icon: 'hourglass_top',
          title: 'Cần hoàn tất thiết lập trên Stripe',
          body: 'Stripe đã được liên kết nhưng chưa sẵn sàng để nhận tiền. Vui lòng bấm “Kết nối Stripe” để hoàn tất các bước còn thiếu.',
        };
      } else {
        this.stripeBanner = {
          type: 'warn',
          icon: 'error',
          title: 'Chưa liên kết Stripe',
          body: 'Vui lòng bấm “Kết nối Stripe” để bật thanh toán thẻ.',
        };
      }

      // remove query to avoid repeated banner
      try {
        const nextQuery = { ...(this.$route?.query || {}) };
        delete nextQuery.stripeConnect;
        this.$router?.replace({ query: nextQuery });
      } catch (e) {
        // ignore
      }
    },
    async startStripeConnect() {
      this.stripeConnect.loading = true;
      try {
        const res = await stripeConnectService.createLink();
        const url = res.data?.data?.url;
        if (!url) {
          alert('Không thể tạo link kết nối Stripe lúc này.');
          return;
        }
        window.location.href = url;
      } catch (e) {
        alert(e?.response?.data?.message || 'Không thể kết nối Stripe lúc này.');
      } finally {
        this.stripeConnect.loading = false;
      }
    },
    async disconnectStripe() {
      if (!confirm('Ngắt liên kết Stripe? Khách sẽ không thanh toán thẻ được cho tới khi bạn kết nối lại.')) return;
      this.stripeConnect.loading = true;
      try {
        await stripeConnectService.disconnect();
        this.stripeConnect.connected = false;
        this.stripeConnect.details = null;
        this.stripeConnectAccountId = '';
        alert('Đã ngắt liên kết Stripe.');
      } catch (e) {
        alert(e?.response?.data?.message || 'Không thể ngắt liên kết lúc này.');
      } finally {
        this.stripeConnect.loading = false;
      }
    },
    async loadOwnerClubs() {
      try {
        const r = await clubService.getOwnerClubs();
        const list = r.data?.data || r.data?.clubs || [];
        this.ownerClubs = Array.isArray(list) ? list : [];
        if (!this.transferClubId && this.ownerClubs.length) {
          this.transferClubId = this.ownerClubs[0].id;
        }
        this.syncClubTransferFromList();
      } catch (e) {
        console.warn('loadOwnerClubs(payment)', e?.response?.status);
      }
    },
    async refreshAll() {
      await Promise.all([this.loadProfile(), this.loadStripeConnectStatus(), this.loadOwnerClubs()]);
      if (this.activeTab === 'list') {
        await this.fetchPayments();
      }
    },
    formatVnd(v) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));
    },
    fmtTimeOnly(dt) {
      const d = new Date(dt);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    },
    fmtDateTime(iso) {
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
    },
    methodLabel(m) {
      const map = {
        CREDIT_CARD: 'Thẻ (Stripe)',
        VNPAY: 'VNPay',
        MOMO: 'MoMo',
        BANK_TRANSFER: 'Chuyển khoản',
        CASH: 'Tiền mặt',
      };
      return map[m] || m || '—';
    },
    statusLabel(s) {
      const map = {
        CONFIRMED: 'Thành công',
        WAITING_PAYMENT: 'Chờ duyệt',
        PENDING: 'Đang xử lý',
        CANCELLED: 'Đã hủy',
        REFUNDED: 'Đã hoàn',
      };
      return map[s] || s || '—';
    },
    resetFilters() {
      this.filters = { clubId: '', method: '', status: '', from: '', to: '', q: '' };
      this.fetchPayments();
    },
    async fetchPayments() {
      this.paymentsLoading = true;
      this.paymentsError = '';
      try {
        const params = { ...this.filters };
        Object.keys(params).forEach((k) => {
          if (!params[k]) delete params[k];
        });
        const res = await ownerPaymentsService.getPayments(params);
        this.payments = res.data?.data || [];
      } catch (e) {
        this.paymentsError = e?.response?.data?.message || 'Không thể tải danh sách thanh toán.';
      } finally {
        this.paymentsLoading = false;
      }
    },
    syncClubTransferFromList() {
      const c = this.ownerClubs.find((x) => String(x.id) === String(this.transferClubId));
      if (!c) return;
      this.clubTransfer = {
        transferBankName: c.transferBankName || '',
        transferAccountNumber: c.transferAccountNumber || '',
        transferBeneficiaryName: c.transferBeneficiaryName || '',
        transferQrImageUrl: c.transferQrImageUrl || '',
      };
    },
    transferPayloadForClub() {
      const f = this.clubTransfer;
      const p = {};
      ['transferBankName', 'transferAccountNumber', 'transferBeneficiaryName', 'transferQrImageUrl'].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(f, k)) p[k] = f[k] ? f[k] : null;
      });
      return p;
    },
    async onTransferQrFile(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !this.transferClubId) return;
      if (!TRANSFER_QR_TYPES.includes(file.type)) {
        alert('Chỉ chấp nhận JPG, PNG, WEBP.');
        return;
      }
      if (file.size > TRANSFER_QR_MAX) {
        alert('File vượt quá 5MB.');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'club-transfer-qr');
      fd.append('entityId', String(this.transferClubId));
      this.uploadingTransferQr = true;
      try {
        const res = await clubService.uploadImage(fd);
        if (res.data?.success && res.data?.data?.url) {
          this.clubTransfer.transferQrImageUrl = res.data.data.url;
          const idx = this.ownerClubs.findIndex((x) => String(x.id) === String(this.transferClubId));
          if (idx !== -1) {
            this.ownerClubs[idx] = { ...this.ownerClubs[idx], transferQrImageUrl: res.data.data.url };
          }
        } else {
          alert(res.data?.message || 'Upload thất bại.');
        }
      } catch (e) {
        alert(e.response?.data?.message || e.message || 'Upload thất bại.');
      } finally {
        this.uploadingTransferQr = false;
      }
    },
    async saveChanges() {
      try {
        // Validation for payment info
        if (this.ownerClubs.length) {
          const { transferBankName, transferAccountNumber, transferBeneficiaryName } = this.clubTransfer;
          const specialCharRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ]*$/;
          const numericRegex = /^\d+$/;

          if (transferBankName && !specialCharRegex.test(transferBankName)) {
            alert('Tên ngân hàng không được chứa ký tự đặc biệt.');
            return;
          }
          if (transferAccountNumber && !numericRegex.test(transferAccountNumber)) {
            alert('Số tài khoản chỉ được chứa chữ số.');
            return;
          }
          if (transferBeneficiaryName && !specialCharRegex.test(transferBeneficiaryName)) {
            alert('Tên chủ tài khoản không được chứa ký tự đặc biệt.');
            return;
          }
        }

        // 1) Save stripe connect id
        const rawStripe = String(this.stripeConnectAccountId || '').trim();
        if (rawStripe && !rawStripe.startsWith('acct_')) {
          alert('Stripe Connect Account ID không hợp lệ (phải bắt đầu bằng acct_).');
          return;
        }
        this.saving = true;
        await api.patch('/owner/profile', { stripeConnectAccountId: rawStripe });

        // 2) Save transfer info per club (or all)
        if (this.ownerClubs.length) {
          const tp = this.transferPayloadForClub();
          if (this.applyTransferToAllClubs && this.ownerClubs.length > 1) {
            await Promise.all(this.ownerClubs.map((c) => clubService.editClub(c.id, tp)));
            this.applyTransferToAllClubs = false;
          } else if (this.transferClubId) {
            await clubService.editClub(this.transferClubId, tp);
          }
          const r = await clubService.getOwnerClubs();
          const list = r.data?.data || r.data?.clubs || [];
          this.ownerClubs = Array.isArray(list) ? list : [];
          this.syncClubTransferFromList();
        }

        this.savedAt = new Date();
        alert('✅ Đã lưu cấu hình thanh toán!');
      } catch (err) {
        alert('Lỗi: ' + (err.response?.data?.message || 'Không thể lưu lúc này.'));
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

/* Reuse styles from SettingsView layout */
.settings-view { display: flex; flex-direction: column; gap: 18px; }
.view-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.header-info { min-width: 0; }
.view-title { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 0.2px; }
.view-subtitle { margin: 6px 0 0; color: #64748b; font-weight: 600; }
.save-btn { display: inline-flex; align-items: center; gap: 8px; border: none; background: #16a34a; color: #fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; cursor: pointer; }
.save-btn:hover { filter: brightness(0.98); }
.save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; }
.card-alt { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 14px; }
.pane-header h3 { margin: 0; font-size: 18px; font-weight: 900; }
.pane-header p { margin: 6px 0 0; color: #64748b; font-weight: 600; }
.pane-header { margin-bottom: 12px; }

.muted { color: #64748b; font-weight: 700; font-size: 12px; }

.payment-section-title { margin: 18px 0 10px; display: flex; align-items: center; gap: 8px; font-weight: 900; }
.transfer-intro { margin: 0 0 12px; color: #64748b; font-weight: 600; }
.payment-section-title { margin: 0 0 10px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full-width { grid-column: 1 / -1; }
label { font-weight: 800; color: #0f172a; }
input, select { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 12px; font-weight: 700; outline: none; }
input:focus, select:focus { border-color: rgba(22,163,74,0.5); box-shadow: 0 0 0 3px rgba(22,163,74,0.12); }
.hint { color: #94a3b8; font-size: 12px; font-weight: 600; }
.error-text { color: #b91c1c; font-size: 12px; font-weight: 800; }
code { background: #f1f5f9; padding: 2px 6px; border-radius: 8px; }

.transfer-empty { display: flex; align-items: center; gap: 10px; color: #64748b; font-weight: 700; }
.transfer-empty .material-icons { color: #94a3b8; }
.transfer-apply-all-wrap { margin: 8px 0 2px; }
.transfer-apply-all-label { display: flex; align-items: center; gap: 10px; font-weight: 800; }
.transfer-hint { margin: 6px 0 0; color: #64748b; font-weight: 600; }

.transfer-qr-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.transfer-qr-preview { width: 160px; height: 120px; border-radius: 14px; border: 1px dashed #cbd5e1; background: #fff; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 6px; cursor: pointer; overflow: hidden; }
.transfer-qr-preview img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
.transfer-qr-preview.uploading { opacity: 0.6; pointer-events: none; }
.btn-outline { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; background: #fff; padding: 10px 12px; border-radius: 12px; font-weight: 900; cursor: pointer; }
.btn-outline:hover { background: #f8fafc; }
.btn-outline:disabled { opacity: 0.7; cursor: not-allowed; }

.tabs-row { display: flex; gap: 10px; align-items: center; }
.tab-meta { margin-left: auto; display: flex; gap: 10px; align-items: center; }
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 10px 12px;
  border-radius: 12px;
  font-weight: 900;
  cursor: pointer;
  color: #0f172a;
}
.tab-btn.active { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }

.config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.config-card { padding: 16px; }
.card-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.card-top-right { display: flex; align-items: center; gap: 10px; }
.status-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; font-weight: 900; font-size: 12px; }
.status-pill .dot { width: 8px; height: 8px; border-radius: 999px; background: #94a3b8; }
.status-pill.ok { border-color: #bbf7d0; background: #f0fdf4; color: #16a34a; }
.status-pill.ok .dot { background: #16a34a; }
.status-pill.off { border-color: #e2e8f0; background: #f8fafc; color: #64748b; }
.status-pill.off .dot { background: #94a3b8; }

.stripe-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 12px 14px;
  background: #fff;
}
.stripe-banner.ok { border-color: #bbf7d0; background: #f0fdf4; }
.stripe-banner.warn { border-color: #fde68a; background: #fffbeb; }
.stripe-banner-left { display: flex; gap: 10px; align-items: flex-start; }
.stripe-banner-left .material-icons { margin-top: 1px; }
.stripe-banner-title { font-weight: 1000; color: #0f172a; }
.stripe-banner-body { margin-top: 2px; color: #475569; font-weight: 700; font-size: 13px; }
.banner-close { border: none; background: transparent; font-size: 18px; line-height: 1; cursor: pointer; color: #64748b; padding: 2px 6px; border-radius: 10px; }
.banner-close:hover { background: rgba(15, 23, 42, 0.06); }

.stripe-actions { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
.stripe-meta { flex: 1; min-width: 240px; }
.stripe-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.mini-pill { display: inline-flex; padding: 4px 10px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 900; font-size: 12px; }
.mini-pill.ok { border-color: #bbf7d0; background: #f0fdf4; color: #16a34a; }
.mini-pill.warn { border-color: #fde68a; background: #fffbeb; color: #b45309; }
.advanced-box { margin-top: 12px; border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 14px; padding: 10px 12px; }
.advanced-box summary { cursor: pointer; font-weight: 900; color: #0f172a; }

.summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
.summary-item { border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px; background: #fff; }
.summary-val { margin-top: 6px; font-weight: 1000; color: #0f172a; }

.filters { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.filter { display: flex; flex-direction: column; gap: 6px; min-width: 160px; }
.filter.grow { flex: 1; min-width: 260px; }
.filter.actions { flex-direction: row; align-items: flex-end; gap: 10px; }

/* Payments list: force light theme (avoid global dark overrides) */
.tab-pane.card { background: #fff !important; color: #0f172a !important; }
.table-wrap { margin-top: 14px; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 14px; }
.pay-table { width: 100%; border-collapse: collapse; background: #fff !important; color: #0f172a !important; }
.pay-table th, .pay-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a !important; }
.pay-table th { background: #f8fafc; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
.pay-table tbody tr:hover { background: transparent !important; }
.right { text-align: right; }
.strong { font-weight: 900; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; }
.pill { display: inline-flex; padding: 3px 10px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 900; font-size: 12px; }
.pill.status.confirmed { border-color: #bbf7d0; background: #f0fdf4; color: #16a34a; }
.pill.status.cancelled { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.pill.status.waiting_payment { border-color: #fde68a; background: #fffbeb; color: #b45309; }
.pill.status.pending { border-color: #cbd5e1; background: #f8fafc; color: #475569; }
.pill.status.refunded { border-color: #bae6fd; background: #eff6ff; color: #0369a1; }
.empty-table { padding: 14px; color: #64748b; font-weight: 700; }
.loading-box { margin-top: 12px; color: #64748b; font-weight: 700; }
.error-box { margin-top: 12px; color: #b91c1c; font-weight: 800; }

@media (max-width: 900px) {
  .view-header { flex-direction: column; align-items: flex-start; }
  .form-grid { grid-template-columns: 1fr; }
  .config-grid { grid-template-columns: 1fr; }
  .summary-row { grid-template-columns: 1fr 1fr; }
}
.error-text-pay {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 5px;
  font-weight: 500;
  animation: fadeInPay 0.2s ease-out;
}

.is-invalid-pay {
  border-color: #ef4444 !important;
  background-color: #fef2f2 !important;
}

@keyframes fadeInPay {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>

