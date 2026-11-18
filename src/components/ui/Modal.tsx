/**
 * Modal dialog — consistent overlay, panel shape, header, and close button.
 * Supports standard form width (max-w-lg), wide (max-w-2xl), extraWide (max-w-4xl), or custom maxWidth.
 */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  extraWide = false,
  maxWidth,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  extraWide?: boolean;
  maxWidth?: string;
}) {
  const widthClass = maxWidth ?? (extraWide ? "max-w-4xl" : wide ? "max-w-2xl" : "max-w-lg");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full modal-enter flex flex-col ${widthClass}`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none
              text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
