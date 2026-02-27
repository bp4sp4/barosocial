export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <style>{`footer { display: none !important; }`}</style>
    </>
  );
}
