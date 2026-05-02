export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#EAE7D6] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-[#5D7B6F]/10 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[#5D7B6F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-[#5D7B6F]">
            Đang Nâng Cấp
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            Hệ thống đang được bảo trì để mang lại trải nghiệm tốt hơn.
            Vui lòng quay lại sau ít phút.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-[#5D7B6F]/20" />

        {/* Footer */}
        <p className="text-sm text-gray-400">
          Nếu bạn là quản trị viên,{' '}
          <a
            href="/login"
            className="text-[#5D7B6F] font-semibold hover:underline"
          >
            đăng nhập tại đây
          </a>
        </p>
      </div>
    </div>
  )
}
