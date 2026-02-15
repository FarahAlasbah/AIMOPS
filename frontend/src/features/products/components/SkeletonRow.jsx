// frontend/src/features/products/components/SkeletonRow.jsx

export default function SkeletonRow({ cols = 9 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div className="sk" />
        </td>
      ))}
    </tr>
  );
}
