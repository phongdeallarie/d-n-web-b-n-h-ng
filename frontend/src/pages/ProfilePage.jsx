import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useShop } from "../context/ShopContext.jsx";

const emptyAddress = {
  label: "Nhà riêng",
  receiverName: "",
  phone: "",
  line1: "",
  ward: "",
  district: "",
  city: "",
  isDefault: false,
};

export default function ProfilePage() {
  const { user, saveProfile, changePassword, refreshProfile, showToast } = useShop();
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "", avatar: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
      });
      setAddresses(user.addresses || []);
    }
  }, [user]);

  async function fetchAddresses() {
    try {
      const data = await apiFetch("/addresses");
      setAddresses(data);
      await refreshProfile();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  useEffect(() => {
    fetchAddresses();
  }, []);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    try {
      await saveProfile(profileForm);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handleAddressSubmit(e) {
    e.preventDefault();
    try {
      if (editingAddressId) {
        await apiFetch(`/addresses/${editingAddressId}`, { method: "PUT", body: JSON.stringify(addressForm) });
        showToast("Cập nhật địa chỉ thành công.");
      } else {
        await apiFetch("/addresses", { method: "POST", body: JSON.stringify(addressForm) });
        showToast("Thêm địa chỉ thành công.");
      }
      setAddressForm(emptyAddress);
      setEditingAddressId(null);
      await fetchAddresses();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  const defaultAddress = useMemo(() => addresses.find((item) => item.isDefault), [addresses]);

  return (
    <div className="container page-section">
      <div className="section-heading">
        <h1>Tài khoản của tôi</h1>
        <p>Quản lý hồ sơ, mật khẩu và địa chỉ giao hàng.</p>
      </div>

      <section className="detail-grid-two">
        <form className="card-panel form-grid" onSubmit={handleProfileSubmit}>
          <h2>Thông tin cá nhân</h2>
          <label>
            Họ và tên
            <input value={profileForm.fullName} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} />
          </label>
          <label>
            Email
            <input value={user?.email || ""} disabled />
          </label>
          <label>
            Số điện thoại
            <input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
          </label>
          <label>
            URL avatar
            <input value={profileForm.avatar} onChange={(e) => setProfileForm((p) => ({ ...p, avatar: e.target.value }))} />
          </label>
          <div className="info-inline">
            <span>Điểm tích lũy: <strong>{user?.loyaltyPoint || 0}</strong></span>
            <span>Địa chỉ mặc định: <strong>{defaultAddress?.line1 || "Chưa có"}</strong></span>
          </div>
          <button className="btn primary" type="submit">Lưu hồ sơ</button>
        </form>

        <form className="card-panel form-grid" onSubmit={handlePasswordSubmit}>
          <h2>Đổi mật khẩu</h2>
          <label>
            Mật khẩu hiện tại
            <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} />
          </label>
          <label>
            Mật khẩu mới
            <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} />
          </label>
          <button className="btn primary" type="submit">Cập nhật mật khẩu</button>
        </form>
      </section>

      <section className="detail-grid-two">
        <div className="card-panel">
          <h2>Danh sách địa chỉ</h2>
          {addresses.length === 0 ? <p>Bạn chưa có địa chỉ nào.</p> : null}
          <div className="address-list">
            {addresses.map((address) => (
              <div className="address-card" key={address.id}>
                <div className="row between wrap">
                  <strong>{address.label} {address.isDefault ? "• Mặc định" : ""}</strong>
                  <div className="row gap wrap">
                    {!address.isDefault ? (
                      <button className="text-btn" type="button" onClick={async () => {
                        await apiFetch(`/addresses/${address.id}/default`, { method: "PATCH" });
                        showToast("Đã đặt địa chỉ mặc định.");
                        fetchAddresses();
                      }}>Đặt mặc định</button>
                    ) : null}
                    <button className="text-btn" type="button" onClick={() => {
                      setEditingAddressId(address.id);
                      setAddressForm({
                        label: address.label,
                        receiverName: address.receiverName,
                        phone: address.phone,
                        line1: address.line1,
                        ward: address.ward || "",
                        district: address.district || "",
                        city: address.city,
                        isDefault: address.isDefault,
                      });
                    }}>Sửa</button>
                    <button className="text-btn danger-text" type="button" onClick={async () => {
                      await apiFetch(`/addresses/${address.id}`, { method: "DELETE" });
                      showToast("Đã xóa địa chỉ.", "info");
                      fetchAddresses();
                    }}>Xóa</button>
                  </div>
                </div>
                <p>{address.receiverName} • {address.phone}</p>
                <p>{address.line1}, {address.ward ? `${address.ward}, ` : ""}{address.district ? `${address.district}, ` : ""}{address.city}</p>
              </div>
            ))}
          </div>
        </div>

        <form className="card-panel form-grid" onSubmit={handleAddressSubmit}>
          <h2>{editingAddressId ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}</h2>
          <label>
            Nhãn địa chỉ
            <input value={addressForm.label} onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))} />
          </label>
          <label>
            Người nhận
            <input value={addressForm.receiverName} onChange={(e) => setAddressForm((p) => ({ ...p, receiverName: e.target.value }))} required />
          </label>
          <label>
            Số điện thoại
            <input value={addressForm.phone} onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value }))} required />
          </label>
          <label>
            Địa chỉ cụ thể
            <input value={addressForm.line1} onChange={(e) => setAddressForm((p) => ({ ...p, line1: e.target.value }))} required />
          </label>
          <label>
            Phường/Xã
            <input value={addressForm.ward} onChange={(e) => setAddressForm((p) => ({ ...p, ward: e.target.value }))} />
          </label>
          <label>
            Quận/Huyện
            <input value={addressForm.district} onChange={(e) => setAddressForm((p) => ({ ...p, district: e.target.value }))} />
          </label>
          <label>
            Tỉnh/Thành phố
            <input value={addressForm.city} onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} required />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm((p) => ({ ...p, isDefault: e.target.checked }))} />
            Đặt làm địa chỉ mặc định
          </label>
          <div className="row gap wrap">
            <button className="btn primary" type="submit">{editingAddressId ? "Lưu thay đổi" : "Thêm địa chỉ"}</button>
            {editingAddressId ? (
              <button className="btn outline" type="button" onClick={() => { setEditingAddressId(null); setAddressForm(emptyAddress); }}>
                Hủy chỉnh sửa
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
