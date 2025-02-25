import { useParams } from 'react-router-dom';

const ProductPage = () => {
  const { id } = useParams();  // جلب الـ ID من الرابط

  // هنا خاصك تجيب بيانات المنتج من Firebase باستخدام ID
  return (
    <div className="product-page">
      <h1>تفاصيل المنتج</h1>
      <p>معرف المنتج: {id}</p>
      {/* هنا خاصك تعرض تفاصيل المنتج من قاعدة البيانات */}
    </div>
  );
};

export default ProductPage;
