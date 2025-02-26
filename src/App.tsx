import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, Package, Shield, Zap, Moon, Sun, Star } from 'lucide-react';
import { Helmet } from 'react-helmet';

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC3ENJExu01i7yODhQQO5k6-BuZ13737T4",
  authDomain: "elamli-shop.firebaseapp.com",
  projectId: "elamli-shop",
  storageBucket: "elamli-shop.appspot.com",
  messagingSenderId: "740777134694",
  appId: "1:740777134694:web:6064048d820d18540afba7",
  measurementId: "G-MNT2CS1QSD"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تعريف الأنواع
interface Product {
  id: string;
  name: string;
  price: number | string;
  imageUrl: string;
  description: string;
  additionalImages?: string[];
  details?: string[];
  specifications?: string[];
}

interface OrderDetails {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
}

interface Order {
  productId: string;
  productName: string;
  productPrice: number | string;
  customerDetails: OrderDetails;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: any;
}

interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

function formatPrice(price: number | string): string {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numericPrice) ? numericPrice.toFixed(2) : '0.00';
}

// آراء وهمية
const mockReviews: Review[] = [
  { id: "r1", productId: "product_10", customerName: "سارة", rating: 4, comment: "منتج رائع وأنيق، التوصيل كان سريعًا!", createdAt: "2025-02-24" },
  { id: "r2", productId: "product_10", customerName: "نورا", rating: 5, comment: "جودة ممتازة، أحببت التصميم!", createdAt: "2025-02-23" },
  { id: "r3", productId: "product_10", customerName: "ليلى", rating: 3, comment: "جيد ولكن السعر مرتفع قليلاً.", createdAt: "2025-02-22" },
  { id: "r4", productId: "product_10", customerName: "فاطمة", rating: 4, comment: "مريح وعملي، أنصح به.", createdAt: "2025-02-21" },
];

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    fullName: '', phone: '', address: '', city: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareMessage, setShareMessage] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            price: data.price || 0,
            imageUrl: data.imageUrl || '',
            description: data.description || 'منتج عالي الجودة مصنوع من أفضل المواد.',
            additionalImages: Array.isArray(data.additionalImages) ? data.additionalImages : [],
            details: Array.isArray(data.details) ? data.details : [],
            specifications: Array.isArray(data.specifications) ? data.specifications : []
          };
        });
        setProducts(productsData);
        setLoading(false);

        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get("product");
        if (productId) {
          const foundProduct = productsData.find(p => p.id === productId);
          if (foundProduct) {
            setSelectedProduct(foundProduct);
          }
        }
      } catch (err) {
        console.error("خطأ في جلب المنتجات:", err);
        setError("فشل في تحميل المنتجات. يرجى المحاولة مرة أخرى لاحقًا.");
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct && selectedProduct.id) {
      const productReviews = mockReviews.filter(review => review.productId === selectedProduct.id);
      setReviews(productReviews);
      setSelectedImage(selectedProduct.imageUrl);
    } else {
      setReviews([]);
    }
  }, [selectedProduct]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowCheckout(false);
  };

  const handleImageClick = (image: string) => setSelectedImage(image);

  const handleBuyNow = () => setShowCheckout(true);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!orderDetails.phone.match(/^\+?\d{9,15}$/)) {
      alert('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    if (!orderDetails.fullName.trim() || !orderDetails.address.trim() || !orderDetails.city.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    try {
      const order: Order = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
        customerDetails: orderDetails,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "orders"), order);
      alert('تم استلام طلبك بنجاح! سنتصل بك قريباً لتأكيد الطلب.');
      setOrderDetails({ fullName: '', phone: '', address: '', city: '', notes: '' });
      setShowCheckout(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error("خطأ في تقديم الطلب:", err);
      alert('عذراً، حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setShowCheckout(false);
  };

  const handleShareProduct = async (product: Product) => {
    const productUrl = `https://elamli.shop/?product=${product.id}`; // استبدل بنطاقك
    const shareData = {
      title: product.name,
      text: `اطلع على هذا المنتج: ${product.name} - ${product.description}`,
      url: productUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareMessage("تمت المشاركة بنجاح!");
      } catch (err) {
        setShareMessage("فشل في المشاركة، حاول مرة أخرى.");
      }
    } else {
      try {
        await navigator.clipboard.writeText(productUrl);
        setShareMessage("تم نسخ رابط المنتج بنجاح!");
      } catch (err) {
        console.error("فشل في نسخ الرابط:", err);
        setShareMessage(`فشل في النسخ تلقائيًا. انسخ الرابط يدويًا: ${productUrl}`);
      }
    }
    setTimeout(() => setShareMessage(''), 5000);
  };

  const themeClasses = isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';

  return (
    <div className={`min-h-screen ${themeClasses}`}>
      <Helmet>
        <title>ELAMLI - إكسسوارات وساعات نسائية أنيقة</title>
        <meta name="description" content="تسوقي أفضل الإكسسوارات والساعات النسائية الأنيقة من ELAMLI مع توصيل سريع خلال 24 ساعة والدفع عند الاستلام." />
        <meta name="keywords" content="إكسسوارات نسائية, ساعات أنيقة, تسوق عبر الإنترنت, ELAMLI, دفع عند الاستلام" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="ELAMLI - إكسسوارات وساعات نسائية" />
        <meta property="og:description" content="اكتشفي مجموعتنا الفريدة من الإكسسوارات والساعات النسائية الأنيقة مع توصيل سريع وآمن." />
        <meta property="og:image" content="https://yourdomain.shop/og-image.jpg" />
        <meta property="og:url" content="https://yourdomain.shop" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://yourdomain.shop" />
        {selectedProduct && (
          <>
            <title>{`${selectedProduct.name} - ELAMLI`}</title>
            <meta name="description" content={`${selectedProduct.description} - تسوقي الآن من ELAMLI بسعر ${formatPrice(selectedProduct.price)} درهم.`} />
            <meta property="og:title" content={`${selectedProduct.name} - ELAMLI`} />
            <meta property="og:description" content={`${selectedProduct.description}`} />
            <meta property="og:image" content={selectedProduct.imageUrl} />
            <meta property="og:url" content={`https://yourdomain.shop/?product=${selectedProduct.id}`} />
          </>
        )}
      </Helmet>

      {selectedProduct ? (
        <div>
          <header className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="container mx-auto px-4 py-4">
              <motion.button 
                onClick={handleBackToProducts}
                className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-brand-600 hover:text-brand-800'} flex items-center gap-2`}
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowRight className="w-5 h-5" />
                <span>العودة للمنتجات</span>
              </motion.button>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <AnimatePresence mode="wait">
              {!showCheckout ? (
                <motion.div 
                  className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-lg p-8`}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={fadeIn}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <motion.img 
                        src={selectedImage} 
                        alt={selectedProduct.name}
                        className="w-full h-[500px] object-cover rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        loading="lazy"
                      />
                      {selectedProduct.additionalImages && selectedProduct.additionalImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {[selectedProduct.imageUrl, ...(selectedProduct.additionalImages || [])].map((image, index) => (
                            <motion.img 
                              key={index}
                              src={image} 
                              alt={`${selectedProduct.name} - صورة ${index + 1}`}
                              className={`w-full h-24 object-cover rounded-lg cursor-pointer transition-all ${
                                selectedImage === image ? 'ring-2 ring-brand-500' : 'opacity-70 hover:opacity-100'
                              }`}
                              onClick={() => handleImageClick(image)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              loading="lazy"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <motion.h1 
                        className="text-3xl font-bold mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {selectedProduct.name}
                      </motion.h1>
                      <motion.div 
                        className="text-2xl font-bold text-brand-600 mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        {formatPrice(selectedProduct.price)} درهم
                      </motion.div>
                      <motion.div 
                        className="prose prose-lg mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed mb-4`}>
                          {selectedProduct.description}
                        </p>
                        {selectedProduct.details && selectedProduct.details.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-xl font-semibold mb-3">المميزات</h3>
                            <ul className="space-y-2">
                              {selectedProduct.details.map((detail, index) => (
                                <motion.li 
                                  key={index} 
                                  className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} flex items-center gap-2`}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 + index * 0.1 }}
                                >
                                  <span className="w-2 h-2 bg-brand-500 rounded-full" />
                                  {detail}
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                      <motion.button 
                        onClick={() => handleShareProduct(selectedProduct)}
                        className={`${isDarkMode ? 'border-gray-300 text-gray-300 hover:bg-gray-700' : 'border-gray-600 text-gray-600 hover:bg-gray-100'} btn btn-outline w-full mt-4 flex items-center justify-center gap-2 border`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Zap className="w-5 h-5" />
                        <span>مشاركة المنتج</span>
                      </motion.button>
                      {shareMessage && (
                        <motion.div 
                          className={`mt-2 text-center ${shareMessage.includes('فشل') ? 'text-red-600' : 'text-green-600'}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {shareMessage}
                          {shareMessage.includes('انسخ الرابط يدويًا') && (
                            <button 
                              onClick={() => navigator.clipboard.writeText(`https://yourdomain.shop/?product=${selectedProduct.id}`).then(() => setShareMessage("تم النسخ يدويًا!"))}
                              className="ml-2 underline text-blue-500"
                            >
                              نسخ الآن
                            </button>
                          )}
                        </motion.div>
                      )}
                      <motion.button
                        onClick={handleBuyNow}
                        className={`${isDarkMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} btn btn-primary w-full mt-4 text-white p-2 rounded`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        اطلب الآن
                      </motion.button>

                      <div className="mt-8">
                        <h3 className="text-2xl font-semibold mb-4">آراء العملاء</h3>
                        {reviews.length > 0 ? (
                          <div className="space-y-4">
                            {reviews.map(review => (
                              <div key={review.id} className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg`}>
                                <div className="flex items-center mb-2">
                                  <span className="font-semibold mr-2">{review.customerName}</span>
                                  <div className="flex">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <Star 
                                        key={i} 
                                        className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} 
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{review.comment}</p>
                                <p className="text-sm text-gray-500 mt-1">{new Date(review.createdAt).toLocaleDateString('ar-EG')}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>لا توجد آراء بعد لهذا المنتج.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-lg p-8`}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={fadeIn}
                >
                  <h2 className="text-2xl font-bold mb-6">تفاصيل الطلب</h2>
                  <form onSubmit={handleOrderSubmit} className="space-y-6">
                    <div>
                      <label className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-2`}>الاسم الكامل</label>
                      <input
                        type="text"
                        required
                        className={`${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} input w-full border rounded p-2`}
                        value={orderDetails.fullName}
                        onChange={(e) => setOrderDetails({...orderDetails, fullName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-2`}>رقم الجوال</label>
                      <input
                        type="tel"
                        required
                        className={`${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} input w-full border rounded p-2`}
                        value={orderDetails.phone}
                        onChange={(e) => setOrderDetails({...orderDetails, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-2`}>العنوان</label>
                      <input
                        type="text"
                        required
                        className={`${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} input w-full border rounded p-2`}
                        value={orderDetails.address}
                        onChange={(e) => setOrderDetails({...orderDetails, address: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-2`}>المدينة</label>
                      <input
                        type="text"
                        required
                        className={`${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} input w-full border rounded p-2`}
                        value={orderDetails.city}
                        onChange={(e) => setOrderDetails({...orderDetails, city: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-2`}>ملاحظات إضافية</label>
                      <textarea
                        className={`${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} input w-full border rounded p-2`}
                        rows={3}
                        value={orderDetails.notes}
                        onChange={(e) => setOrderDetails({...orderDetails, notes: e.target.value})}
                      />
                    </div>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      className={`${isDarkMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} btn btn-primary w-full text-white p-2 rounded ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      whileHover={submitting ? {} : { scale: 1.02 }}
                      whileTap={submitting ? {} : { scale: 0.98 }}
                    >
                      {submitting ? 'جاري تقديم الطلب...' : 'تأكيد الطلب'}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      ) : (
        <div>
          <header className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm sticky top-0 z-50`}>
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <motion.div 
                  className="text-2xl font-bold text-brand-600"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  ELAMLI
                </motion.div>
                <div className="flex-1 max-w-md mx-4">
                  <input
                    type="text"
                    placeholder="ابحث عن الإكسسوارات..."
                    className={`${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} input w-full border rounded p-2`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <motion.div 
                  className="relative cursor-pointer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleDarkMode}
                >
                  {isDarkMode ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-gray-600" />}
                </motion.div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <motion.h1 
              className="text-3xl font-bold text-center text-brand-600 mb-12"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              منتجات جديدة من ELAMLI - إكسسوارات وساعات نسائية
            </motion.h1>
            
            {loading && (
              <div className="text-center py-8">
                <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>جاري التحميل...</div>
              </div>
            )}

            {error && (
              <motion.div 
                className="text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-lg text-red-600">{error}</div>
              </motion.div>
            )}

            <motion.div 
              className="product-grid grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {filteredProducts.map(product => (
                <motion.div 
                  key={product.id} 
                  className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} card shadow-md rounded-lg overflow-hidden`}
                  onClick={() => handleProductClick(product)}
                  variants={fadeIn}
                  whileHover={{ y: -5 }}
                >
                  <div className="relative overflow-hidden">
                    <motion.img 
                      src={product.imageUrl} 
                      alt={`${product.name} - إكسسوارات ELAMLI`}
                      className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
                  </div>
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-2">{product.name}</h2>
                    <div className="text-brand-600 font-bold">{formatPrice(product.price)} درهم</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <section className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg mt-16 p-8`}>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div className="text-center" variants={fadeIn}>
                  <div className="flex justify-center mb-4">
                    <Package className="w-12 h-12 text-brand-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">الدفع عند الاستلام</h3>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>ادفع عند استلام طلبك</p>
                </motion.div>
                <motion.div className="text-center" variants={fadeIn}>
                  <div className="flex justify-center mb-4">
                    <Zap className="w-12 h-12 text-brand-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">توصيل خلال ٢٤ ساعة</h3>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>شحن سريع إلى باب منزلك</p>
                </motion.div>
                <motion.div className="text-center" variants={fadeIn}>
                  <div className="flex justify-center mb-4">
                    <Shield className="w-12 h-12 text-brand-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">موثوق وآمن</h3>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>بياناتك محمية دائمًا</p>
                </motion.div>
              </motion.div>
            </section>
          </main>

          <footer className={`${isDarkMode ? 'bg-gray-800' : 'bg-brand-600'} text-white mt-16 py-12`}>
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">روابط سريعة</h3>
                  <ul className="space-y-2">
                    <li><a href="#" className="hover:text-brand-200 transition-colors">الرئيسية</a></li>
                    <li><a href="#" className="hover:text-brand-200 transition-colors">المتجر</a></li>
                    <li><a href="#" className="hover:text-brand-200 transition-colors">من نحن</a></li>
                    <li><a href="#" className="hover:text-brand-200 transition-colors">اتصل بنا</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">اتصل بنا</h3>
                  <ul className="space-y-2">
                    <li>elamli.support@gmail.com</li>
                    <li>+212640987767</li>
                    <li>شارع الجزائر, تطوان</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">ELAMLI</h3>
                  <p>إكسسوارات وساعات نسائية أنيقة لكل مناسبة.</p>
                </div>
              </div>
              <div className="text-center mt-12 pt-8 border-t border-brand-500">
                <p>© ٢٠٢٥ ELAMLI. جميع الحقوق محفوظة.</p>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}

export default App;