import React, { useState } from 'react';
import {
  X,
  Store,
  MapPin,
  Phone,
  ShieldCheck,
  Package,
  Calendar,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface StoreDetailModalProps {
  merchantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onOpenChat?: (merchantId: string, storeName: string) => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  merchantId,
  isOpen,
  onClose,
  onSelectProduct,
  onOpenChat,
}) => {
  const { merchants, products } = useMarket();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);

  if (!isOpen || !merchantId) return null;

  const store = merchants.find(m => m.id === merchantId);
  if (!store) return null;

  const storeProducts = products.filter(
    p => p.merchantId === store.id && p.approvalStatus === 'approved'
  );

  const galleryImages =
    store.images && store.images.length > 0
      ? store.images
      : store.coverUrl
      ? [store.coverUrl]
      : ['/src/assets/images/hero_dukkana_market_1791352449347.jpg'];

  const coverPhoto = store.coverUrl || galleryImages[0];

  return (
    <div className="fixed inset-0 z-[65] overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-zinc-200 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer transition shadow-md"
          aria-label="إغلاق المتجر"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto no-scrollbar flex-1">
          {/* Store Cover Banner */}
          <div className="relative h-48 sm:h-64 bg-zinc-900 overflow-hidden">
            <img
              src={coverPhoto}
              alt={store.storeName}
              onError={e => {
                (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>

            {/* Store Quick Floating Info */}
            <div className="absolute bottom-4 right-4 left-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-purple-700/90 border-2 border-white/80 shadow-lg flex items-center justify-center text-white shrink-0">
                  <Store className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black">{store.storeName}</h1>
                    <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>متجر معتمد</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-200 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{store.governorate}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-purple-300" />
                      <span>{store.phone}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChat(store.id, store.storeName);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>محادثة المتجر</span>
                  </button>
                )}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold">
                  {storeProducts.length} منتجات
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 space-y-8">
            {/* Store Description */}
            <div className="bg-zinc-50 rounded-2xl p-4 sm:p-5 border border-zinc-200">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1.5">
                نبذة عن المتجر
              </h3>
              <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                {store.description || 'متجر عراقي أصيل يقدم تشكيلة متميزة من المنتجات مع الشحن المباشر لكافة المحافظات والدفع عند الاستلام.'}
              </p>
            </div>

            {/* Store Images Gallery (صور المتجر) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-700" />
                  <h3 className="font-black text-sm sm:text-base text-zinc-900">
                    معرض صور المتجر ({galleryImages.length})
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-500">
                  انقر على أي صورة لتكبيرها واستعراضها
                </span>
              </div>

              {galleryImages.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 text-xs bg-zinc-50 rounded-2xl border border-zinc-200">
                  لا توجد صور إضافية لهذا المتجر حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedPhotoIndex(idx);
                        setIsPhotoLightboxOpen(true);
                      }}
                      className="group relative aspect-4/3 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 hover:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600 transition cursor-pointer"
                    >
                      <img
                        src={imgUrl}
                        alt={`${store.storeName} - صورة ${idx + 1}`}
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/src/assets/images/hero_dukkana_market_1791352449347.jpg';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 right-2 bg-purple-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          الغلاف الرئيسي ⭐
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                        عرض وتكبير
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Store Products Catalog */}
            <div className="space-y-4 pt-4 border-t border-zinc-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-700" />
                  <h3 className="font-black text-sm sm:text-base text-zinc-900">
                    منتجات {store.storeName} ({storeProducts.length})
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-500">
                  الدفع نقداً عند الاستلام
                </span>
              </div>

              {storeProducts.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs bg-zinc-50 rounded-2xl border border-zinc-200">
                  لا توجد منتجات معروضة حالياً لهذا المتجر.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {storeProducts.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onSelectProduct={() => {
                        onClose();
                        onSelectProduct(p);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photo Lightbox Modal */}
        {isPhotoLightboxOpen && (
          <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4">
            <button
              onClick={() => setIsPhotoLightboxOpen(false)}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center">
              <img
                src={galleryImages[selectedPhotoIndex]}
                alt={`صورة المتجر ${selectedPhotoIndex + 1}`}
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedPhotoIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length)
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center cursor-pointer transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedPhotoIndex(prev => (prev + 1) % galleryImages.length)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center cursor-pointer transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            <div className="text-white text-xs mt-3 font-bold">
              صورة {selectedPhotoIndex + 1} من {galleryImages.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
