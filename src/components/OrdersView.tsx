import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Store,
  Phone,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import { formatIQDTabular } from '../utils/currency';

interface OrdersViewProps {
  onOpenReviewModal: (productId: string, orderId: string) => void;
  onOpenChat?: (recipientId: string, orderId?: string, recipientName?: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onOpenReviewModal, onOpenChat }) => {
  const { orders, merchants, updateOrderStatus, reviews } = useMarket();
  const { currentUser, role, isAdmin, isMerchant } = useAuth();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter orders according to user role:
  // - Customer sees their own orders
  // - Merchant sees their store's orders
  // - Admin (strictly authorized) sees all orders
  let displayedOrders = orders;
  if (!isAdmin && isMerchant) {
    const merchantStore =
      merchants.find(m => m.userId === currentUser?.id || m.id === currentUser?.merchantStoreId) ||
      merchants[0];
    displayedOrders = orders.filter(o => o.merchantId === merchantStore?.id);
  } else if (!isAdmin) {
    displayedOrders = orders.filter(o => o.customerId === currentUser?.id);
  }

  if (statusFilter !== 'all') {
    displayedOrders = displayedOrders.filter(o => o.status === statusFilter);
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return {
          label: 'بانتظار موافقة المتجر',
          description: 'الطلب بانتظار مراجعة وتأكيد التاجر لبدء التجهيز.',
          bgColor: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/20',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
        };
      case 'confirmed':
        return {
          label: 'تمت موافقة المتجر وتأكيد الطلب',
          description: 'وافق المتجر على طلبك بنجاح وجارٍ تحويله لقسم التجهيز.',
          bgColor: 'bg-indigo-50 text-indigo-900 border-indigo-300 ring-1 ring-indigo-400/20',
          icon: <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />,
        };
      case 'preparing':
        return {
          label: 'قيد التجهيز والتغليف',
          description: 'يقوم المتجر حالياً بتجهيز وتغليف بضاعتك بعناية للشحن.',
          bgColor: 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-400/20',
          icon: <Package className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'out_for_delivery':
        return {
          label: 'خرج للتوصيل مع المندوب',
          description: 'الطلب في الطريق مع مندوب التوصيل، يرجى الاستعداد للاستلام نقداً.',
          bgColor: 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400/20',
          icon: <Truck className="w-3.5 h-3.5 text-purple-600" />,
        };
      case 'delivered':
        return {
          label: 'تم الاستلام والتسليم بنجاح',
          description: 'تم تسليم الطلب واستلام المبلغ نقداً بنجاح.',
          bgColor: 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/20',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'cancelled':
        return {
          label: 'ملغي',
          description: 'تم إلغاء هذا الطلب.',
          bgColor: 'bg-rose-50 text-rose-900 border-rose-300',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      default:
        return {
          label: status,
          description: 'تحديث حالة الطلب',
          bgColor: 'bg-zinc-50 text-zinc-700 border-zinc-200',
          icon: null,
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-700" />
            <span>
              {isMerchant
                ? 'طلبات المتجر'
                : isAdmin
                ? 'إدارة كافة طلبات المنصة'
                : 'متابعة طلباتي'}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {role === 'customer'
              ? 'متابعة فورية لحالة التوصيل والدفع نقداً عند الاستلام'
              : 'إدارة تحديثات الشحن، التوصيل، واحتساب العمولات'}
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 bg-zinc-100 rounded-xl">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'new', label: 'جديد' },
            { id: 'preparing', label: 'تجهيز' },
            { id: 'out_for_delivery', label: 'بالطريق' },
            { id: 'delivered', label: 'تم التسليم' },
            { id: 'cancelled', label: 'ملغي' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                statusFilter === tab.id
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200 p-8 space-y-3">
            <Package className="w-12 h-12 text-zinc-300 mx-auto" />
            <h3 className="text-base font-bold text-zinc-800">لا توجد طلبات في هذا القسم</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              عند إتمام أي طلب في سوق دكانة، ستتمكن من متابعة حركته خطوة بخطوة حتى وصوله لباب منزلك.
            </p>
          </div>
        ) : (
          displayedOrders.map(order => {
            const badge = getStatusBadge(order.status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden transition"
              >
                {/* Order Summary Header */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50/70 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-purple-950">
                        {order.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bgColor}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1 font-semibold text-zinc-700">
                        <Store className="w-3.5 h-3.5 text-purple-700" />
                        {order.storeName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('ar-IQ')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{order.items.length} منتجات</span>
                    </div>

                    {/* Clear Order Status Announcement */}
                    <div className="pt-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 font-medium">
                        <span className="font-bold text-purple-900">حالة الطلب الحالية:</span>
                        <span className="font-semibold text-zinc-800">{badge.description}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100">
                    <div className="text-right sm:text-left">
                      <div className="text-xs text-zinc-400">المبلغ نقداً عند الاستلام:</div>
                      <div className="text-base font-black text-purple-950 tabular-nums">
                        {formatIQDTabular(order.finalTotal)}
                      </div>
                    </div>
                    <div className="text-zinc-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-zinc-50/50 border-t border-zinc-200 space-y-4">
                    {/* Status Pipeline Progress Bar */}
                    <div className="bg-white p-3.5 rounded-xl border border-zinc-200">
                      <div className="text-xs font-bold text-zinc-700 mb-2">مراحل الطلب:</div>
                      <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                        {[
                          { key: 'new', label: '1. جديد' },
                          { key: 'confirmed', label: '2. تأكيد' },
                          { key: 'preparing', label: '3. تجهيز' },
                          { key: 'out_for_delivery', label: '4. توصيل' },
                          { key: 'delivered', label: '5. تم الاستلام' },
                        ].map((step, idx) => {
                          const isDone =
                            order.status === 'delivered' ||
                            (order.status === 'out_for_delivery' && idx <= 3) ||
                            (order.status === 'preparing' && idx <= 2) ||
                            (order.status === 'confirmed' && idx <= 1) ||
                            (order.status === 'new' && idx === 0);

                          return (
                            <div
                              key={step.key}
                              className={`py-1.5 rounded-md font-bold transition ${
                                order.status === 'cancelled'
                                  ? 'bg-zinc-100 text-zinc-400'
                                  : isDone
                                  ? 'bg-purple-700 text-white'
                                  : 'bg-zinc-100 text-zinc-400'
                              }`}
                            >
                              {step.label}
                            </div>
                          );
                        })}
                      </div>

                      {order.status === 'cancelled' && (
                        <div className="mt-2 text-xs font-bold text-rose-700 text-center bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          هذا الطلب ملغي. لا يتم احتساب أي عمولة أو رسوم.
                        </div>
                      )}

                      {/* Detailed Order Status Tracking History Log */}
                      {order.statusHistory && order.statusHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-100">
                          <div className="text-[11px] font-bold text-zinc-600 mb-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-700" />
                            <span>سجل تتبع الشحنة والتحديثات اللحظية:</span>
                          </div>
                          <div className="space-y-1.5">
                            {order.statusHistory.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span>
                                  <span className="font-bold text-zinc-800">
                                    {getStatusBadge(item.status).label}
                                  </span>
                                  {item.note && (
                                    <span className="text-zinc-500 font-medium">({item.note})</span>
                                  )}
                                </div>
                                <span className="text-zinc-400 tabular-nums text-[10px]">
                                  {new Date(item.timestamp).toLocaleString('ar-IQ', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Merchant & Admin Order Status Controls */}
                    {(isMerchant || isAdmin) && (
                      <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 space-y-2">
                        <div className="text-xs font-bold text-purple-950 flex items-center justify-between">
                          <span>تحديث حالة الطلب ({isAdmin ? 'صلاحية المدير' : 'صلاحية التاجر'}):</span>
                          {order.status === 'delivered' && (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              عمولة دكانة ({order.commissionRate}%): {formatIQDTabular(order.commissionAmount)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(['new', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as OrderStatus[]).map(st => (
                            <button
                              key={st}
                              onClick={() => updateOrderStatus(order.id, st)}
                              disabled={order.status === st}
                              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition cursor-pointer ${
                                order.status === st
                                  ? 'bg-purple-700 text-white'
                                  : 'bg-white text-zinc-700 border border-purple-200 hover:bg-purple-100'
                              }`}
                            >
                              {getStatusBadge(st).label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delivery & Recipient Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-zinc-200">
                      <div>
                        <span className="text-zinc-400 block mb-0.5">المستلم ورقم الهاتف:</span>
                        <div className="font-bold text-zinc-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-purple-700" />
                          <span>{order.recipientName} ({order.recipientPhone})</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-400 block mb-0.5">عنوان التوصيل (المحافظة):</span>
                        <div className="font-bold text-zinc-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          <span>{order.governorate} - {order.detailedAddress}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                      <div className="p-3 bg-zinc-50 font-bold text-xs text-zinc-700">
                        محتويات الطلب:
                      </div>
                      {order.items.map(item => (
                        <div
                          key={item.productId}
                          className="p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-10 h-10 rounded-lg object-cover bg-zinc-100 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-zinc-900 block truncate">
                                {item.productName}
                              </span>
                              <span className="text-zinc-500 text-[11px]">
                                {item.quantity} × {formatIQDTabular(item.unitPrice)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-purple-950 tabular-nums">
                              {formatIQDTabular(item.totalPrice)}
                            </span>

                            {/* Verified Review Button: Enabled ONLY if order is 'delivered' */}
                            {order.status === 'delivered' && role === 'customer' && (() => {
                              const existingItemReview = reviews.find(
                                r => r.productId === item.productId && r.orderId === order.id && r.userId === currentUser?.id
                              );
                              if (existingItemReview) {
                                return (
                                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>تم التقييم ({existingItemReview.rating}★)</span>
                                  </span>
                                );
                              }
                              return (
                                <button
                                  onClick={() => onOpenReviewModal(item.productId, order.id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  <span>تقييم</span>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Receipt Summary */}
                    <div className="p-3.5 bg-white rounded-xl border border-zinc-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-zinc-600">
                        <span>مجموع المنتجات:</span>
                        <span className="tabular-nums font-semibold">{formatIQDTabular(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>أجور التوصيل:</span>
                        <span className="tabular-nums font-semibold">{formatIQDTabular(order.deliveryFee)}</span>
                      </div>
                      {order.appliedCoupon && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>خصم كوبون المنصة ({order.appliedCoupon.code}):</span>
                          <span className="tabular-nums">-{formatIQDTabular(order.appliedCoupon.discountAmount)}</span>
                        </div>
                      )}
                      <div className="pt-1.5 border-t border-zinc-100 flex justify-between font-black text-sm text-purple-950">
                        <span>المبلغ النهائي المطلوب للدفع عند الاستلام:</span>
                        <span className="tabular-nums">{formatIQDTabular(order.finalTotal)}</span>
                      </div>
                    </div>

                    {/* Chat with Merchant Action */}
                    {onOpenChat && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          هل لديك استفسار حول موعد التوصيل أو تفاصيل الطلب؟
                        </span>
                        <button
                          onClick={() => onOpenChat(order.merchantId, order.id, order.storeName)}
                          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 text-purple-700" />
                          <span>محادثة المتجر بخصوص هذا الطلب</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
