export default function Card({ title, value }) {
  return (
    <div
      style={{
        background: "white",
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}
    >
      <h4>{title}</h4>
      <h2 style={{ color: "#800020" }}>{value}</h2>
    </div>
  );
}