import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Icons } from './components/Icons';
import { Scanner } from './components/Scanner';
import { Invoice, InvoiceItem, Product, AppSettings, ViewState } from './types';

// Utility for Excel export
declare global {
  interface Window {
    XLSX: any;
  }
}

const App: React.FC = () => {
  // State
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ appName: 'متجري' });

  // UI State - Create Invoice
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [currentInvoiceItems, setCurrentInvoiceItems] = useState<InvoiceItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay'>('cash');
  
  // UI State - Edit Invoice
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // UI State - Scanner
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<'createInvoice' | 'addProduct' | null>(null);

  // New Product Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, barcode: '' });

  // Load Data on Mount
  useEffect(() => {
    const loadedProducts = localStorage.getItem('products');
    const loadedInvoices = localStorage.getItem('invoices');
    const loadedSettings = localStorage.getItem('settings');

    if (loadedProducts) setProducts(JSON.parse(loadedProducts));
    if (loadedInvoices) setInvoices(JSON.parse(loadedInvoices));
    if (loadedSettings) setSettings(JSON.parse(loadedSettings));
  }, []);

  // Save Data on Change
  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  // --- Handlers ---

  const handleScan = (code: string) => {
    setScannerOpen(false);
    
    if (scanTarget === 'createInvoice') {
      const product = products.find(p => p.barcode === code);
      if (product) {
        addItemToInvoice(product);
      } else {
        alert('المنتج غير مسجل');
      }
    } else if (scanTarget === 'addProduct') {
      setNewProduct(prev => ({ ...prev, barcode: code }));
    }
  };

  const addItemToInvoice = (product: Product) => {
    setCurrentInvoiceItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } 
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }];
    });
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCurrentInvoiceItems(prev => prev.filter(item => item.productId !== productId));
      return;
    }
    setCurrentInvoiceItems(prev => prev.map(item => 
      item.productId === productId
        ? { ...item, quantity, total: quantity * item.price }
        : item
    ));
  };

  const saveInvoice = () => {
    if (currentInvoiceItems.length === 0) return;

    const totalAmount = currentInvoiceItems.reduce((sum, item) => sum + item.total, 0);
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      items: currentInvoiceItems,
      totalAmount,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      paymentMethod
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setCreateModalOpen(false);
    setCurrentInvoiceItems([]);
    setPaymentMethod('cash');
    setCurrentView('invoices'); // Navigate to Saved Invoices
  };

  const deleteInvoice = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    }
  };

  const saveEditedInvoice = () => {
    if (!editingInvoice) return;
    
    // Recalculate total
    const totalAmount = editingInvoice.items.reduce((sum, item) => sum + item.total, 0);
    const updatedInvoice = { ...editingInvoice, totalAmount };

    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    setEditingInvoice(null);
  };

  const exportExcel = () => {
    // Flatten data for sold items report
    const itemMap = new Map<string, { name: string; quantity: number; total: number }>();
    let grandTotal = 0;

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, total: 0 };
        existing.quantity += item.quantity;
        existing.total += item.total;
        itemMap.set(item.name, existing);
        grandTotal += item.total;
      });
    });

    const data = Array.from(itemMap.values()).map(i => ({
      'اسم الصنف': i.name,
      'الكمية المباعة': i.quantity,
      'القيمة الإجمالية': i.total
    }));

    // Add footer row
    data.push({
      'اسم الصنف': 'الإجمالي العام',
      'الكمية المباعة': 0, // Placeholder
      'القيمة الإجمالية': grandTotal
    });

    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "تقرير المبيعات");
    window.XLSX.writeFile(wb, "تقرير_المبيعات.xlsx");
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ products, invoices, settings });
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'backup_data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.products) setProducts(parsed.products);
          if (parsed.invoices) setInvoices(parsed.invoices);
          if (parsed.settings) setSettings(parsed.settings);
          alert('تم استيراد البيانات بنجاح');
        } catch (err) {
          alert('ملف غير صالح');
        }
      };
    }
  };

  // --- Derived State for Sold Items View ---
  const soldItemsReport = useMemo(() => {
    const report: { [key: string]: { name: string; count: number; value: number } } = {};
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!report[item.productId]) {
          report[item.productId] = { name: item.name, count: 0, value: 0 };
        }
        report[item.productId].count += item.quantity;
        report[item.productId].value += item.total;
      });
    });
    return Object.values(report);
  }, [invoices]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-safe">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-full">
            <Icons.Menu />
          </button>
          <h1 className="text-xl font-bold text-emerald-700">{settings.appName}</h1>
        </div>
      </header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNavigate={setCurrentView}
        activeView={currentView}
        appName={settings.appName}
      />

      {isScannerOpen && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setScannerOpen(false)} 
        />
      )}

      {/* Main Content */}
      <main className="p-4 max-w-4xl mx-auto">
        
        {/* VIEW: DASHBOARD (Sales) */}
        {currentView === 'dashboard' && (
          <div className="flex flex-col items-center justify-center h-[80vh]">
             <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                <div className="mb-6 bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <Icons.Plus />
                </div>
                <h2 className="text-2xl font-bold mb-2">نقطة بيع جديدة</h2>
                <p className="text-gray-500 mb-8">ابدأ عملية بيع جديدة وسجل المنتجات</p>
                <button 
                  onClick={() => setCreateModalOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 text-lg"
                >
                  إنشاء فاتورة
                </button>
             </div>
          </div>
        )}

        {/* VIEW: INVOICES LIST */}
        {currentView === 'invoices' && (
          <div className="space-y-4">
            <div className="bg-emerald-600 text-white p-6 rounded-xl shadow-lg mb-6">
              <p className="text-emerald-100 mb-1">إجمالي الفواتير</p>
              <h2 className="text-3xl font-bold">
                {invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()} ج.م
              </h2>
            </div>

            <div className="flex justify-end mb-4">
               <button onClick={exportExcel} className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg shadow hover:bg-green-800">
                 <Icons.FileSpreadsheet />
                 <span>تصدير اكسيل</span>
               </button>
            </div>

            <div className="space-y-3">
              {invoices.length === 0 && <p className="text-center text-gray-400 py-10">لا توجد فواتير محفوظة</p>}
              {invoices.map(invoice => (
                <div key={invoice.id} className="bg-white p-4 rounded-xl shadow border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">فاتورة #{invoice.id.slice(-4)}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.date).toLocaleDateString('ar-EG')} - {new Date(invoice.date).toLocaleTimeString('ar-EG')}
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-emerald-600 text-lg">{invoice.totalAmount.toLocaleString()} ج.م</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {invoice.paymentMethod === 'cash' ? 'نقدي' : 'انستا باي'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2 justify-end border-t pt-3">
                    <button 
                      onClick={() => setEditingInvoice(invoice)}
                      className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      <Icons.Edit /> تعديل
                    </button>
                    <button 
                      onClick={() => deleteInvoice(invoice.id)}
                      className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      <Icons.Trash /> حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: SOLD ITEMS */}
        {currentView === 'soldItems' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">الأصناف المباعة</h2>
            <div className="grid gap-3">
               {soldItemsReport.map((item, idx) => (
                 <div key={idx} className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-500">تم بيع: <span className="font-bold text-gray-900">{item.count}</span> قطعة</p>
                    </div>
                    <div className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-lg">
                      {item.value.toLocaleString()} ج.م
                    </div>
                 </div>
               ))}
               {soldItemsReport.length === 0 && <p className="text-center text-gray-400 py-10">لا توجد مبيعات حتى الآن</p>}
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {currentView === 'settings' && (
          <div className="space-y-6 pb-20">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg mb-4">إعدادات التطبيق</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم البرنامج</label>
                <input 
                  type="text" 
                  value={settings.appName}
                  onChange={(e) => setSettings({...settings, appName: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg mb-4">إضافة صنف جديد</h3>
              <div className="grid gap-3">
                 <input 
                  type="text" 
                  placeholder="اسم الصنف"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                 />
                 <input 
                  type="number" 
                  placeholder="السعر"
                  value={newProduct.price || ''}
                  onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                  className="w-full p-3 border rounded-lg"
                 />
                 <div className="flex gap-2">
                   <input 
                    type="text" 
                    placeholder="الباركود (يدوي أو مسح)"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                    className="flex-1 p-3 border rounded-lg"
                   />
                   <button 
                    onClick={() => { setScanTarget('addProduct'); setScannerOpen(true); }}
                    className="bg-gray-800 text-white p-3 rounded-lg"
                   >
                     <Icons.Camera />
                   </button>
                 </div>
                 <button 
                  onClick={() => {
                    if (newProduct.name && newProduct.price) {
                      const product: Product = {
                         id: Date.now().toString(),
                         name: newProduct.name!,
                         price: newProduct.price!,
                         barcode: newProduct.barcode || ''
                      };
                      setProducts([...products, product]);
                      setNewProduct({ name: '', price: 0, barcode: '' });
                      alert('تمت الإضافة بنجاح');
                    }
                  }}
                  className="bg-emerald-600 text-white py-3 rounded-lg font-bold mt-2"
                 >
                   إضافة الصنف
                 </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
               <h3 className="font-bold text-lg mb-4">قائمة الأصناف (للتعديل)</h3>
               <div className="max-h-60 overflow-y-auto space-y-2">
                 {products.map(p => (
                   <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                     <input 
                        value={p.name}
                        onChange={(e) => setProducts(products.map(pr => pr.id === p.id ? {...pr, name: e.target.value} : pr))}
                        className="bg-transparent font-medium w-1/3"
                     />
                     <input 
                        type="number"
                        value={p.price}
                        onChange={(e) => setProducts(products.map(pr => pr.id === p.id ? {...pr, price: parseFloat(e.target.value)} : pr))}
                        className="bg-white border rounded px-2 py-1 w-20 text-center"
                     />
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow space-y-3">
               <h3 className="font-bold text-lg">البيانات</h3>
               <div className="flex gap-3">
                 <button onClick={exportData} className="flex-1 bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2">
                   <Icons.Download /> تصدير نسخة
                 </button>
                 <label className="flex-1 bg-orange-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                   <Icons.Upload /> استيراد نسخة
                   <input type="file" accept=".json" onChange={importData} className="hidden" />
                 </label>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* --- CREATE INVOICE MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl h-[90vh] sm:h-auto flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">إنشاء فاتورة جديدة</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-2 bg-gray-200 rounded-full"><Icons.X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Product Selection / Scanning */}
              <div className="space-y-3">
                 <label className="text-sm font-bold text-gray-700">إضافة منتج</label>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => { setScanTarget('createInvoice'); setScannerOpen(true); }}
                      className="bg-gray-800 text-white p-3 rounded-lg shrink-0"
                    >
                      <Icons.Scan />
                    </button>
                    <select 
                      onChange={(e) => {
                        const p = products.find(pr => pr.id === e.target.value);
                        if(p) addItemToInvoice(p);
                        e.target.value = "";
                      }}
                      className="w-full p-3 border rounded-lg bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>اختر منتجاً أو امسح الباركود</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {p.price} ج.م</option>
                      ))}
                    </select>
                 </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {currentInvoiceItems.map((item) => (
                  <div key={item.productId} className="flex flex-col p-3 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{item.name}</span>
                      <button onClick={() => updateItemQuantity(item.productId, 0)} className="text-red-500"><Icons.Trash /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-lg bg-white overflow-hidden">
                        <button onClick={() => updateItemQuantity(item.productId, item.quantity - 1)} className="px-3 py-1 bg-gray-100">-</button>
                        <span className="px-4 font-bold">{item.quantity}</span>
                        <button onClick={() => updateItemQuantity(item.productId, item.quantity + 1)} className="px-3 py-1 bg-gray-100">+</button>
                      </div>
                      <div className="flex-1 text-left font-bold text-emerald-700">
                         {item.price} × {item.quantity} = {item.total} ج.م
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">طريقة الدفع</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="cash">نقدي (Cash)</option>
                  <option value="instapay">انستا باي (InstaPay)</option>
                </select>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                 <span className="text-gray-600">الإجمالي:</span>
                 <span className="text-2xl font-bold text-emerald-600">
                   {currentInvoiceItems.reduce((sum, i) => sum + i.total, 0)} ج.م
                 </span>
              </div>
              <button 
                onClick={saveInvoice}
                disabled={currentInvoiceItems.length === 0}
                className="w-full bg-emerald-600 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
              >
                إنشاء وحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT INVOICE MODAL --- */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
               <h3 className="font-bold">تعديل الفاتورة</h3>
               <button onClick={() => setEditingInvoice(null)} className="p-2"><Icons.X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {editingInvoice.items.map((item, idx) => (
                 <div key={idx} className="bg-gray-50 p-3 rounded-lg border">
                    <div className="mb-2">
                       <label className="text-xs text-gray-500">اسم الصنف</label>
                       <input 
                         value={item.name} 
                         onChange={(e) => {
                           const newItems = [...editingInvoice.items];
                           newItems[idx] = { ...item, name: e.target.value };
                           setEditingInvoice({ ...editingInvoice, items: newItems });
                         }}
                         className="w-full bg-white border p-1 rounded"
                       />
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">السعر</label>
                          <input 
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value);
                              const newItems = [...editingInvoice.items];
                              newItems[idx] = { ...item, price: newPrice, total: newPrice * item.quantity };
                              setEditingInvoice({ ...editingInvoice, items: newItems });
                            }}
                            className="w-full bg-white border p-1 rounded"
                          />
                       </div>
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">الكمية</label>
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseFloat(e.target.value);
                              const newItems = [...editingInvoice.items];
                              newItems[idx] = { ...item, quantity: newQty, total: item.price * newQty };
                              setEditingInvoice({ ...editingInvoice, items: newItems });
                            }}
                            className="w-full bg-white border p-1 rounded"
                          />
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-4 border-t">
              <button onClick={saveEditedInvoice} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
                 حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
