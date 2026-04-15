export default function Loading({ text = "Đang tải dữ liệu..." }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}
