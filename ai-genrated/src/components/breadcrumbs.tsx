import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center text-xs text-[#2a1a12]/60 mb-6 font-medium">
      <Link href="/" className="hover:text-[#c45c26] transition">Home</Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center">
          <span className="mx-2 text-[#2a1a12]/30">/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-[#c45c26] transition">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#2a1a12]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
