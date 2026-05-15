/**
 * Kỹ thuật lọc lỗi Hydration Mismatch do Extension (Bitdefender, Google Translate, etc.)
 * Chỉ chạy trong môi trường Development.
 */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const isExtensionAttribute = (msg: string) => 
    msg.includes('bis_skin_checked') || 
    msg.includes('bis_register') || 
    msg.includes('__processed_') ||
    msg.includes('extension');

  const originalError = console.error;
  
  console.error = (...args: any[]) => {
    const errorMsg = args[0];
    
    // Nếu là lỗi Hydration và có dấu hiệu của Extension, bỏ qua không in ra console
    if (
      typeof errorMsg === 'string' && 
      (errorMsg.includes('Hydration failed') || errorMsg.includes('did not match')) &&
      args.some(arg => typeof arg === 'string' && isExtensionAttribute(arg))
    ) {
      return;
    }
    
    // Giảm bớt các log thừa của React về Hydration khi đã biết nguyên nhân là do Extension
    if (typeof errorMsg === 'string' && errorMsg.includes('There was an error during hydration')) {
        return;
    }

    originalError.apply(console, args);
  };
}
