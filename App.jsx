```react
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  ShoppingCart, 
  User, 
  Search, 
  Plus, 
  Minus, 
  ChevronLeft, 
  LogOut, 
  LayoutDashboard, 
  Utensils, 
  ReceiptText,
  Trash2,
  Edit,
  CheckCircle2,
  Menu as MenuIcon,
  X,
  ShoppingBag,
  MessageCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  Lock,
  Image as ImageIcon,
  Store,
  AlertCircle
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

// --- INISIALISASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC1EGlnEc5U655Po6j-4_ktNue9SDNcyPs",
  authDomain: "kedai-mimmin.firebaseapp.com",
  projectId: "kedai-mimmin",
  storageBucket: "kedai-mimmin.firebasestorage.app",
  messagingSenderId: "913245244373",
  appId: "1:913245244373:web:452c837b086599efae0b5c"
};

// --- DATA DUMMY AWAL (Untuk Sinkronisasi Awal Database) ---
const initialMenu = [
  { id: '1', name: 'Chicken Tenders', price: 45000, category: 'Ayam', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80', desc: 'Ayam krispi tanpa tulang dengan saus spesial.', isReady: true },
  { id: '2', name: 'Spaghetti Bolognese', price: 35000, category: 'Mie', image: 'https://images.unsplash.com/photo-1621996311239-50c337b01dcb?w=500&q=80', desc: 'Pasta italia dengan saus daging sapi cincang.', isReady: true },
  { id: '3', name: 'Beef Burger Classic', price: 50000, category: 'Burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', desc: 'Burger sapi dengan keju leleh dan sayuran segar.', isReady: true },
  { id: '4', name: 'Nasi Goreng', price: 12000, category: 'Nasi', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80', desc: 'Nasi goreng lezat dengan berbagai pilihan.', variants: [{name: 'Biasa', price: 12000}, {name: 'Spesial', price: 18000}], isReady: true },
  { id: '5', name: 'Es Teh Manis', price: 10000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80', desc: 'Teh manis dingin menyegarkan.', isReady: true },
  { id: '6', name: 'Kopi Susu Gula Aren', price: 20000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=500&q=80', desc: 'Kopi susu dengan sentuhan gula aren asli.', isReady: true }
];

const categories = ['Semua', 'Ayam', 'Mie', 'Burger', 'Nasi', 'Minuman'];

const formatRp = (angka) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
};

export default function App() {
  // --- GLOBAL STATE ---
  const [view, setView] = useState('public-menu');
  const [menuItems, setMenuItems] = useState(initialMenu);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // State Pengaturan Aplikasi
  const [appSettings, setAppSettings] = useState({
    waNumber: '6281387572560',
    greetingTitle: 'Halo, Sobat!',
    greetingSubtitle: 'Mau makan apa hari ini?',
    adminPin: '1234',
    kasirPin: '1111',
    isStoreOpen: true 
  });

  // State Publik & Admin
  const [publicCart, setPublicCart] = useState([]);
  const [adminCart, setAdminCart] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [variantModal, setVariantModal] = useState({ show: false, item: null, context: 'public' });

  // Database State
  const [dbUser, setDbUser] = useState(null);

  // --- FIREBASE AUTH EFFECT ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth error:", e); }
    };
    initAuth();
    
    const unsubscribeAuth = onAuthStateChanged(auth, setDbUser);
    return () => unsubscribeAuth();
  }, []);

  // --- FIREBASE REAL-TIME SYNC & SEEDING EFFECT ---
  useEffect(() => {
    if (!dbUser || !db) return;
    const basePath = `artifacts/${appId}/users/${dbUser.uid}`;

    // 1. Sync & Seed Settings
    const unsubSet = onSnapshot(doc(db, basePath, 'settings', 'appSettings'), snap => {
      if (snap.exists()) {
        setAppSettings(prev => ({ ...prev, ...snap.data() })); // Merging aman
      } else {
        // Seed default settings jika kosong
        setDoc(doc(db, basePath, 'settings', 'appSettings'), appSettings).catch(console.error);
      }
    }, err => console.error(err));

    // 2. Sync & Seed Menu (Memperbaiki bug sinkronisasi hilang)
    const unsubMenu = onSnapshot(collection(db, basePath, 'menus'), snap => {
      if (snap.empty) {
        // Jika database menu kosong, seed (isi) otomatis dengan initialMenu agar tidak nge-blank
        initialMenu.forEach(item => {
           setDoc(doc(db, basePath, 'menus', String(item.id)), item).catch(console.error);
        });
      } else {
        const m = [];
        snap.forEach(d => m.push({ id: d.id, ...d.data() }));
        // Urutkan berdasarkan ID agar urutan produk tidak acak-acakan saat di-update
        m.sort((a, b) => Number(a.id) - Number(b.id)); 
        setMenuItems(m);
      }
    }, err => console.error(err));

    // 3. Sync Transaksi
    const unsubTrx = onSnapshot(collection(db, basePath, 'transactions'), snap => {
      const t = [];
      snap.forEach(d => t.push({ id: d.id, ...d.data() }));
      t.sort((a,b) => b.timestamp - a.timestamp);
      setTransactions(t);
    }, err => console.error(err));

    // 4. Sync Pengeluaran
    const unsubExp = onSnapshot(collection(db, basePath, 'expenses'), snap => {
      const e = [];
      snap.forEach(d => e.push({ id: d.id, ...d.data() }));
      e.sort((a,b) => b.timestamp - a.timestamp);
      setExpenses(e);
    }, err => console.error(err));

    return () => { unsubSet(); unsubMenu(); unsubTrx(); unsubExp(); };
  }, [dbUser]);

  // Auto-hide sidebar untuk mobile
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); else setIsSidebarOpen(true); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- FUNGSI KERANJANG UMUM ---
  const addToCart = (item, cartState, setCartState, selectedVariant = null) => {
    // Validasi Produk Habis (Perlindungan Ekstra)
    const isItemReady = item.isReady !== false;
    if (!isItemReady) return alert('Maaf, produk ini baru saja habis.');

    const cartItemId = selectedVariant ? `${item.id}-${selectedVariant.name}` : item.id;
    const itemPrice = selectedVariant ? selectedVariant.price : item.price;
    const variantName = selectedVariant ? selectedVariant.name : null;
    const existing = cartState.find(c => c.cartItemId === cartItemId);

    if (existing) {
      setCartState(cartState.map(c => c.cartItemId === cartItemId ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCartState([...cartState, { ...item, cartItemId, price: itemPrice, variantName, qty: 1 }]);
    }
  };

  const updateQty = (cartItemId, delta, cartState, setCartState) => {
    setCartState(cartState.map(c => {
      if (c.cartItemId === cartItemId) {
        const newQty = c.qty + delta;
        return newQty > 0 ? { ...c, qty: newQty } : c;
      }
      return c;
    }));
  };

  const removeFromCart = (cartItemId, cartState, setCartState) => {
    setCartState(cartState.filter(c => c.cartItemId !== cartItemId));
  };

  const getCartTotal = (cartState) => cartState.reduce((total, item) => total + (item.price * item.qty), 0);

  const handleItemClick = (item, context) => {
    // Validasi Toko Tutup / Barang Habis
    const isItemReady = item.isReady !== false;
    if (!isItemReady) return; // Jika habis, tombol diam/tidak melakukan apa-apa

    if (context === 'public' && !appSettings.isStoreOpen) {
      return alert('Maaf, kedai sedang tutup. Anda tidak dapat memesan saat ini.');
    }

    if (item.variants && item.variants.length > 0) setVariantModal({ show: true, item, context });
    else {
      if (context === 'public') addToCart(item, publicCart, setPublicCart);
      if (context === 'admin') addToCart(item, adminCart, setAdminCart);
    }
  };

  // --- PROSES CHECKOUT ---
  const handleCheckout = async (cartItems, source, customerInfo = 'Guest/Meja', notes = '') => {
    if (cartItems.length === 0) return;
    
    if (source === 'Publik' && !appSettings.isStoreOpen) {
      return alert('Maaf, kedai sedang tutup. Pesanan dibatalkan.');
    }

    // Validasi Keamanan Lanjutan: Cek apakah item di keranjang tiba-tiba "Habis" di database
    const outOfStockItems = cartItems.filter(cartItem => {
      const menuItem = menuItems.find(m => m.id === cartItem.id);
      return menuItem && menuItem.isReady === false;
    });

    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(i => i.name).join(', ');
      return alert(`Gagal Checkout! Produk berikut baru saja habis: ${itemNames}. Silakan hapus item tersebut dari keranjang Anda terlebih dahulu.`);
    }

    const total = getCartTotal(cartItems);
    const newTransaction = {
      id: `TRX-${Date.now()}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString('id-ID'),
      items: [...cartItems],
      total: total,
      source: source,
      customer: customerInfo,
      status: 'Selesai'
    };
    
    // Simpan ke database
    if (dbUser && db) {
      const basePath = `artifacts/${appId}/users/${dbUser.uid}`;
      await setDoc(doc(db, basePath, 'transactions', newTransaction.id), newTransaction);
    } else {
      setTransactions([newTransaction, ...transactions]); 
    }
    
    if (source === 'Publik') {
      const waNumber = appSettings.waNumber;
      let message = `*Halo, pesanan baru nih!*\n\n*Pemesan/Meja:* ${customerInfo}\n`;
      if (notes) message += `*Catatan:* ${notes}\n`;
      message += `\n*Daftar Pesanan:*\n`;
      cartItems.forEach(item => {
        const variantText = item.variantName ? ` (${item.variantName})` : '';
        message += `- ${item.qty}x ${item.name}${variantText} : ${formatRp(item.price * item.qty)}\n`;
      });
      message += `\n*Total Tagihan: ${formatRp(total)}*`;
      
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      setPublicCart([]);
      setView('public-menu');
    } else {
      setAdminCart([]);
      alert('Pembayaran berhasil dicatat!');
    }
  };


  // ==========================================
  // KOMPONEN: APLIKASI PUBLIK (MOBILE VIEW)
  // ==========================================

  const PublicMenu = () => {
    const [activeCat, setActiveCat] = useState('Semua');
    const [search, setSearch] = useState('');

    const filteredMenu = menuItems.filter(item => 
      (activeCat === 'Semua' || item.category === activeCat) &&
      item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="pb-20 bg-gray-50 min-h-screen max-w-md mx-auto shadow-lg relative">
        {/* Banner Kedai Tutup */}
        {!appSettings.isStoreOpen && (
          <div className="bg-red-500 text-white text-center py-2 text-xs font-bold tracking-widest animate-pulse">
            KEDAI SEDANG TUTUP
          </div>
        )}

        <div className={`p-5 bg-white shadow-sm ${appSettings.isStoreOpen ? 'rounded-b-3xl' : 'rounded-b-2xl'}`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{appSettings.greetingTitle}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-gray-500">{appSettings.greetingSubtitle}</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${appSettings.isStoreOpen ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {appSettings.isStoreOpen ? 'BUKA' : 'TUTUP'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 cursor-pointer hover:bg-orange-200 transition-colors" onClick={() => setView('admin-login')}>
              <User size={20} />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Cari makanan..." 
              className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex overflow-x-auto gap-3 p-5 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${activeCat === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 px-5">
          {filteredMenu.map(item => {
            const isItemReady = item.isReady !== false; 
            
            return (
              <div key={item.id} className={`bg-white rounded-2xl p-3 shadow-sm border relative overflow-hidden ${!appSettings.isStoreOpen ? 'opacity-70 border-red-100' : 'border-gray-100'}`}>
                
                {/* Overlay HABIS jika produk tidak ready */}
                {!isItemReady && (
                  <div className="absolute inset-0 bg-white/60 z-20 flex flex-col items-center justify-center backdrop-blur-[1px] rounded-2xl">
                    <span className="bg-red-500 text-white font-black text-lg px-4 py-1 rounded-lg border-2 border-white shadow-lg transform -rotate-12 tracking-widest">
                      HABIS
                    </span>
                  </div>
                )}

                {item.variants && item.variants.length > 0 && isItemReady && (
                  <span className="absolute top-2 right-2 bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-full font-bold z-10">Varian</span>
                )}
                
                <img src={item.image} alt={item.name} className={`w-full h-24 object-cover rounded-xl mb-3 bg-gray-100 ${(!appSettings.isStoreOpen || !isItemReady) ? 'grayscale opacity-70' : ''}`} />
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{item.name}</h3>
                <p className={`font-bold mt-1 mb-2 text-sm ${!isItemReady ? 'text-gray-400' : 'text-orange-500'}`}>
                  {item.variants && item.variants.length > 0 ? `Mulai ${formatRp(Math.min(...item.variants.map(v=>v.price)))}` : formatRp(item.price)}
                </p>
                
                <button 
                  onClick={() => handleItemClick(item, 'public')} 
                  disabled={!appSettings.isStoreOpen || !isItemReady}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    !isItemReady 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : appSettings.isStoreOpen 
                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {!isItemReady ? 'Stok Habis' : (appSettings.isStoreOpen ? 'Tambah' : 'Tutup')}
                </button>
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-3 px-6 z-50">
          <button onClick={() => setView('public-menu')} className={`flex flex-col items-center ${view === 'public-menu' ? 'text-orange-500' : 'text-gray-400'}`}>
            <Home size={24} />
            <span className="text-xs mt-1">Menu</span>
          </button>
          <button onClick={() => setView('public-cart')} className={`flex flex-col items-center relative ${view === 'public-cart' ? 'text-orange-500' : 'text-gray-400'}`}>
            <div className="relative">
              <ShoppingCart size={24} />
              {publicCart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {publicCart.reduce((a, b) => a + b.qty, 0)}
                </span>
              )}
            </div>
            <span className="text-xs mt-1">Keranjang</span>
          </button>
        </div>
      </div>
    );
  };

  const PublicCart = () => {
    return (
      <div className="bg-gray-50 min-h-screen max-w-md mx-auto shadow-lg pb-24 relative flex flex-col">
        <div className="p-5 bg-white flex items-center shadow-sm">
          <button onClick={() => setView('public-menu')} className="p-2 -ml-2 text-gray-600 hover:text-gray-900"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-bold ml-2 text-gray-800">Keranjang Pesanan</h1>
        </div>
        
        {!appSettings.isStoreOpen && publicCart.length > 0 && (
           <div className="bg-red-50 text-red-600 text-xs p-3 text-center border-b border-red-100 font-medium">
             Maaf, kedai sedang tutup. Anda tidak dapat melanjutkan pesanan ini.
           </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {publicCart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-20">
              <ShoppingCart size={64} className="mb-4 opacity-50" />
              <p>Keranjang kamu masih kosong.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {publicCart.map(item => {
                const menuItem = menuItems.find(m => m.id === item.id);
                const isItemReady = menuItem && menuItem.isReady !== false;

                return (
                  <div key={item.cartItemId} className={`flex gap-4 bg-white p-3 rounded-2xl shadow-sm border ${!isItemReady ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
                    <img src={item.image} alt={item.name} className={`w-20 h-20 object-cover rounded-xl ${!isItemReady && 'grayscale opacity-70'}`} />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className={`font-bold ${!isItemReady ? 'text-gray-500' : 'text-gray-800'}`}>
                          {item.name}
                          {!isItemReady && <span className="ml-2 text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">HABIS</span>}
                        </h3>
                        {item.variantName && <p className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">{item.variantName}</p>}
                        <p className={`font-bold text-sm mt-1 ${!isItemReady ? 'text-gray-400' : 'text-orange-500'}`}>{formatRp(item.price)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <button onClick={() => removeFromCart(item.cartItemId, publicCart, setPublicCart)} className="text-red-400 p-1 hover:bg-red-100 rounded-md"><Trash2 size={18} /></button>
                        <div className="flex items-center bg-gray-100 rounded-lg">
                          <button onClick={() => updateQty(item.cartItemId, -1, publicCart, setPublicCart)} className="w-8 h-8 flex items-center justify-center text-gray-600"><Minus size={14}/></button>
                          <span className="w-6 text-center text-sm font-bold text-gray-800">{item.qty}</span>
                          <button onClick={() => updateQty(item.cartItemId, 1, publicCart, setPublicCart)} className="w-8 h-8 flex items-center justify-center text-orange-500"><Plus size={14}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {publicCart.length > 0 && (
          <div className="fixed bottom-0 max-w-md w-full bg-white border-t border-gray-200 p-5 rounded-t-3xl shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between mb-2 text-sm text-gray-600"><span>Subtotal</span><span>{formatRp(getCartTotal(publicCart))}</span></div>
            <div className="flex justify-between mb-4 font-bold text-lg text-gray-800"><span>Total Akhir</span><span className="text-orange-500">{formatRp(getCartTotal(publicCart))}</span></div>
            <button 
              onClick={() => setView('public-checkout')} 
              disabled={!appSettings.isStoreOpen}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-colors ${appSettings.isStoreOpen ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              {appSettings.isStoreOpen ? 'Lanjut Checkout' : 'Kedai Tutup'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const PublicCheckout = () => {
    const [tableNo, setTableNo] = useState('');
    const [notes, setNotes] = useState('');

    return (
      <div className="bg-gray-50 min-h-screen max-w-md mx-auto shadow-lg relative flex flex-col">
        <div className="p-5 bg-white flex items-center shadow-sm">
          <button onClick={() => setView('public-cart')} className="p-2 -ml-2 text-gray-600 hover:text-gray-900"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-bold ml-2 text-gray-800">Detail Pembayaran</h1>
        </div>
        <div className="p-5 space-y-6 flex-1 overflow-y-auto">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Informasi Pemesan</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Nomor Meja / Nama Pemesan</label>
                <input type="text" value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="Contoh: Meja 05 / Budi" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 mt-1 focus:ring-2 focus:ring-orange-500 outline-none"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Catatan Tambahan (Opsional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Jangan pakai pedas..." className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 mt-1 focus:ring-2 focus:ring-orange-500 outline-none h-20"></textarea>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-3">Ringkasan Pesanan</h3>
             <div className="space-y-2 mb-3">
               {publicCart.map(item => (
                 <div key={item.cartItemId} className="flex justify-between text-sm">
                   <span className="text-gray-600">{item.qty}x {item.name} {item.variantName ? `(${item.variantName})` : ''}</span>
                   <span className="font-medium text-gray-800">{formatRp(item.price * item.qty)}</span>
                 </div>
               ))}
             </div>
             <div className="border-t border-dashed pt-3 flex justify-between font-bold text-lg">
                <span className="text-gray-800">Total Bayar</span>
                <span className="text-orange-500">{formatRp(getCartTotal(publicCart))}</span>
             </div>
          </div>
           <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-start gap-3 border border-green-100">
              <MessageCircle className="mt-0.5 shrink-0" size={20} />
              <p className="text-sm font-medium">Pesanan Anda akan dikirimkan ke WhatsApp admin kami untuk segera diproses.</p>
           </div>
        </div>
        <div className="p-5 bg-white border-t border-gray-200">
            <button 
              onClick={() => { 
                if(!appSettings.isStoreOpen) return alert('Kedai sedang tutup!'); 
                if(!tableNo) return alert('Silakan isi Nomor Meja atau Nama Anda terlebih dahulu!'); 
                handleCheckout(publicCart, 'Publik', tableNo, notes); 
              }} 
              disabled={!appSettings.isStoreOpen}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-colors flex items-center justify-center gap-2 ${appSettings.isStoreOpen ? 'bg-[#25D366] text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              <MessageCircle size={24} /> {appSettings.isStoreOpen ? 'Pesan via WhatsApp' : 'Kedai Tutup'}
            </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // KOMPONEN: APLIKASI ADMIN & KASIR
  // ==========================================

  const AdminLogin = () => {
    const [pin, setPin] = useState('');
    const handleLogin = (e) => {
      e.preventDefault();
      if (pin === appSettings.adminPin) { setCurrentUser('admin'); setView('admin-dashboard'); }
      else if (pin === appSettings.kasirPin) { setCurrentUser('kasir'); setView('admin-dashboard'); }
      else { alert('PIN Salah! Silakan coba lagi.'); setPin(''); }
    };

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
            <h1 className="text-2xl font-bold text-gray-800">Login Pegawai</h1>
            <p className="text-gray-500 mt-1">Masukkan PIN untuk melanjutkan</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <input type="password" placeholder="Masukkan PIN Anda" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full text-center text-2xl tracking-widest bg-gray-50 border border-gray-200 rounded-xl py-4 px-4 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200" autoFocus />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">Masuk</button>
          </form>
          <button onClick={() => setView('public-menu')} className="w-full mt-4 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Kembali ke Mode Pelanggan</button>
        </div>
      </div>
    );
  };

  const AdminSidebar = () => (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 h-screen flex flex-col p-4 shrink-0 transition-transform duration-300 overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden lg:flex'}`}>
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">P</div>
            <div>
              <h2 className="font-bold text-gray-800 leading-tight">POS Kedai</h2>
              <p className="text-xs text-green-600 font-bold capitalize bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">Akses {currentUser}</p>
            </div>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button onClick={() => { setView('admin-dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'admin-dashboard' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutDashboard size={20} /> Kasir (POS)</button>
          <button onClick={() => { setView('admin-transactions'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'admin-transactions' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><ReceiptText size={20} /> Riwayat Transaksi</button>

          {currentUser === 'admin' && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Kelola Restoran</div>
              <button onClick={() => { setView('admin-menu'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'admin-menu' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Utensils size={20} /> Manajemen Menu</button>
              <button onClick={() => { setView('admin-finance'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'admin-finance' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Wallet size={20} /> Laporan Keuangan</button>
              <button onClick={() => { setView('admin-settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'admin-settings' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><Settings size={20} /> Pengaturan Sistem</button>
            </>
          )}
        </nav>
        <button onClick={() => { setCurrentUser(null); setView('public-menu'); }} className="mt-auto w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"><LogOut size={20} /> Keluar Sistem</button>
      </div>
    </>
  );

  const AdminDashboard = () => {
    const [activeCat, setActiveCat] = useState('Semua');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const filteredMenu = menuItems.filter(item => activeCat === 'Semua' || item.category === activeCat);

    return (
      <div className="flex h-screen bg-gray-50 w-full overflow-hidden relative">
        <AdminSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"><MenuIcon size={24} /></button>
              <h1 className="text-2xl font-bold text-gray-800">Mesin Kasir</h1>
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {categories.map(cat => (
                 <button key={cat} onClick={() => setActiveCat(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap ${activeCat === cat ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 pb-24 sm:pb-10">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMenu.map(item => {
                const isItemReady = item.isReady !== false;

                return (
                  <div key={item.id} onClick={() => handleItemClick(item, 'admin')} className={`bg-white p-3 rounded-xl shadow-sm border ${isItemReady ? 'border-gray-100 cursor-pointer hover:border-green-500 group relative' : 'border-red-100 opacity-60 cursor-not-allowed relative overflow-hidden'}`}>
                    
                    {!isItemReady && (
                      <div className="absolute inset-0 bg-white/60 z-20 flex flex-col items-center justify-center">
                        <span className="bg-red-500 text-white font-black text-sm px-3 py-1 rounded-lg border border-white transform -rotate-12 tracking-widest shadow-md">HABIS</span>
                      </div>
                    )}

                    {isItemReady && <div className="absolute top-2 right-2 bg-white/90 text-green-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"><Plus size={16} /></div>}
                    {item.variants && item.variants.length > 0 && isItemReady && <span className="absolute top-2 left-2 bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-md font-bold z-10 shadow-sm">Varian</span>}
                    <img src={item.image} alt={item.name} className={`w-full h-32 object-cover rounded-lg mb-3 bg-gray-100 ${!isItemReady && 'grayscale opacity-80'}`} />
                    <h3 className={`font-semibold text-sm line-clamp-1 ${!isItemReady ? 'text-gray-500' : 'text-gray-800'}`}>{item.name}</h3>
                    <p className={`font-bold mt-1 text-sm ${isItemReady ? 'text-green-600' : 'text-gray-400'}`}>{item.variants && item.variants.length > 0 ? `Mulai ${formatRp(Math.min(...item.variants.map(v=>v.price)))}` : formatRp(item.price)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl transform transition-transform duration-300 lg:static lg:translate-x-0 ${isCartOpen ? 'translate-x-0' : 'translate-x-full hidden lg:flex'}`}>
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
            <div><h2 className="text-xl font-bold text-gray-800">Keranjang Kasir</h2><p className="text-sm text-gray-500">Pelanggan Langsung (Walk-in)</p></div>
            <button className="lg:hidden text-gray-500 p-2 hover:bg-gray-100 rounded-lg" onClick={() => setIsCartOpen(false)}><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {adminCart.length === 0 ? (
              <div className="text-center text-gray-400 mt-20"><ShoppingCart size={48} className="mx-auto mb-2 opacity-50" /><p>Belum ada item ditambahkan.</p></div>
            ) : (
               adminCart.map(item => (
                <div key={item.cartItemId} className="flex flex-col border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-2/3"><h4 className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</h4>{item.variantName && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">{item.variantName}</span>}</div>
                    <span className="font-bold text-sm text-gray-800">{formatRp(item.price * item.qty)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                     <button onClick={() => removeFromCart(item.cartItemId, adminCart, setAdminCart)} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md h-8">
                        <button onClick={() => updateQty(item.cartItemId, -1, adminCart, setAdminCart)} className="w-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-md"><Minus size={14}/></button>
                        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                        <button onClick={() => updateQty(item.cartItemId, 1, adminCart, setAdminCart)} className="w-8 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-r-md"><Plus size={14}/></button>
                      </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-5 bg-gray-50 border-t border-gray-200">
             <div className="flex justify-between text-sm mb-2 text-gray-600"><span>Subtotal</span><span>{formatRp(getCartTotal(adminCart))}</span></div>
             <div className="flex justify-between text-xl font-bold mb-4 text-gray-800"><span>Total Akhir</span><span className="text-green-600">{formatRp(getCartTotal(adminCart))}</span></div>
             <button onClick={() => { handleCheckout(adminCart, 'Admin/Kasir'); setIsCartOpen(false); }} disabled={adminCart.length === 0} className={`w-full py-4 rounded-xl font-bold text-lg transition-colors shadow-lg ${adminCart.length > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
              Bayar & Selesai
            </button>
          </div>
        </div>

        <button onClick={() => setIsCartOpen(true)} className="lg:hidden fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-2xl z-30 flex items-center justify-center border-4 border-white">
          <ShoppingBag size={24} />
          {adminCart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm">{adminCart.reduce((a,b)=>a+b.qty,0)}</span>}
        </button>
      </div>
    );
  };

  const AdminMenu = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editForm, setEditForm] = useState({ id: null, name: '', price: '', category: 'Ayam', variantsStr: '', image: '', isReady: true });

    const handleSave = async (e) => {
      e.preventDefault();
      
      let parsedVariants = undefined;
      if (editForm.variantsStr && editForm.variantsStr.trim() !== '') {
        try {
          parsedVariants = editForm.variantsStr.split(',').map(v => {
            const [vName, vPrice] = v.split(':');
            if (!vName || !vPrice || isNaN(Number(vPrice.trim()))) throw new Error("Format error");
            return { name: vName.trim(), price: Number(vPrice.trim()) };
          });
        } catch (err) { return alert('Format Varian Salah! Harap ketik dengan format: Nama:Harga (Contoh: Biasa:12000, Spesial:18000)'); }
      }

      const basePrice = Number(editForm.price);
      const defaultImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';

      const payload = {
        name: editForm.name,
        category: editForm.category,
        price: basePrice,
        variants: parsedVariants || [],
        image: editForm.image || defaultImg,
        desc: editForm.desc || 'Deskripsi menu...',
        isReady: editForm.isReady !== false // Default true
      };

      if (dbUser && db) {
        const basePath = `artifacts/${appId}/users/${dbUser.uid}`;
        const docId = isEditing ? String(editForm.id) : String(Date.now());
        await setDoc(doc(db, basePath, 'menus', docId), { id: docId, ...payload }, { merge: true });
      } else {
        if(isEditing) {
           setMenuItems(menuItems.map(item => item.id === editForm.id ? { id: editForm.id, ...payload } : item));
        } else {
           setMenuItems([...menuItems, { id: String(Date.now()), ...payload }]);
        }
      }

      setIsEditing(false); setIsAdding(false);
      setEditForm({ id: null, name: '', price: '', category: 'Ayam', variantsStr: '', image: '', isReady: true });
    };

    const handleDelete = async (id) => {
      if(confirm('Apakah Anda yakin ingin menghapus menu ini selamanya?')) {
        if (dbUser && db) {
          const basePath = `artifacts/${appId}/users/${dbUser.uid}`;
          await deleteDoc(doc(db, basePath, 'menus', String(id)));
        } else {
          setMenuItems(menuItems.filter(i => i.id !== id));
        }
      }
    };

    // FUNGSI CEPAT: Ubah status ketersediaan (Stok Habis / Tersedia)
    const toggleReadyStatus = async (item) => {
      const newStatus = item.isReady === false ? true : false;
      
      if (dbUser && db) {
        const basePath = `artifacts/${appId}/users/${dbUser.uid}`;
        // Menyimpan update status ke DB tanpa mengganggu item lainnya
        await setDoc(doc(db, basePath, 'menus', String(item.id)), { isReady: newStatus }, { merge: true });
      } else {
        setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, isReady: newStatus } : m));
      }
    };

    return (
      <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-6 sm:mb-8 gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"><MenuIcon size={24} /></button>
                <div><h1 className="text-xl sm:text-2xl font-bold text-gray-800">Manajemen Menu</h1><p className="text-gray-500 text-sm hidden sm:block">Tambah, ubah, atau atur stok daftar makanan.</p></div>
              </div>
              <button onClick={() => { setIsEditing(false); setIsAdding(true); setEditForm({ id: null, name: '', price: '', category: 'Ayam', variantsStr: '', image: '', isReady: true }); }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center shadow-sm"><Plus size={18}/> Tambah Menu Baru</button>
            </div>

            {(isEditing || isAdding) && (
               <form onSubmit={handleSave} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col gap-5">
                 <h2 className="font-bold text-gray-800 border-b pb-2">{isEditing ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
                 <div className="flex flex-col sm:flex-row gap-5 w-full">
                   <div className="w-full sm:w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Menu</label>
                      <input required type="text" value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"/>
                   </div>
                   <div className="w-full sm:w-1/4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                      <select value={editForm.category} onChange={e=>setEditForm({...editForm, category: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white">
                        {categories.filter(c=>c!=='Semua').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="w-full sm:w-1/4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Harga Dasar (Rp)</label>
                      <input required type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"/>
                   </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-5 items-start w-full">
                    <div className="w-full sm:w-1/2 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><ImageIcon size={16}/> Link Foto Menu</label>
                      <input type="url" placeholder="Paste link foto di sini (https://...)" value={editForm.image || ''} onChange={e=>setEditForm({...editForm, image: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm"/>
                    </div>
                    <div className="w-full sm:w-1/2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Varian & Harga (Opsional)</label>
                        <textarea rows="2" placeholder="Contoh: Biasa:12000, Spesial:18000" value={editForm.variantsStr || ''} onChange={e=>setEditForm({...editForm, variantsStr: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm resize-none"></textarea>
                        <p className="text-[10px] text-gray-500 mt-1">Gunakan format <b>NamaVarian:Harga</b>, pisahkan dengan koma.</p>
                    </div>
                 </div>

                 <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => { setIsEditing(false); setIsAdding(false); setEditForm({ id: null, name: '', price: '', category: 'Ayam', variantsStr: '', image: '', isReady: true }); }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors">Batal</button>
                    <button type="submit" className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors">Simpan Menu</button>
                 </div>
               </form>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[750px] text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                    <th className="py-4 px-5 font-bold w-1/3">Informasi Menu</th>
                    <th className="py-4 px-5 font-bold">Kategori</th>
                    <th className="py-4 px-5 font-bold">Harga</th>
                    <th className="py-4 px-5 font-bold text-center">Status Stok</th>
                    <th className="py-4 px-5 font-bold text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {menuItems.map(item => {
                    const isItemReady = item.isReady !== false;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-5 flex items-center gap-4">
                          <img src={item.image} alt={item.name} className={`w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm border border-gray-100 ${!isItemReady && 'grayscale opacity-70'}`} />
                          <div>
                            <p className={`font-bold ${!isItemReady ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.name}</p>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-sm font-medium text-gray-600">{item.category}</td>
                        <td className="py-4 px-5 font-bold text-gray-800">
                          {formatRp(item.price)}
                          {item.variants && item.variants.length > 0 && <div className="text-[10px] text-gray-500 font-medium mt-1 p-1 bg-gray-100 rounded inline-block">{item.variants.map(v=>`${v.name}`).join(', ')}</div>}
                        </td>
                        {/* Kolom Khusus Toggle Stok */}
                        <td className="py-4 px-5 text-center">
                          <button 
                            onClick={() => toggleReadyStatus(item)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border shadow-sm ${
                              isItemReady 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {isItemReady ? 'Tersedia' : 'Habis'}
                          </button>
                        </td>
                        <td className="py-4 px-5 text-right">
                           <button onClick={() => { 
                             const variantsStr = item.variants ? item.variants.map(v => `${v.name}:${v.price}`).join(', ') : '';
                             setIsEditing(true); setEditForm({...item, variantsStr, isReady: isItemReady}); 
                           }} className="text-blue-600 hover:bg-blue-100 p-2.5 rounded-lg inline-flex mr-2 transition-colors"><Edit size={18}/></button>
                           <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-100 p-2.5 rounded-lg inline-flex transition-colors"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdminTransactions = () => {
    return (
      <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
             <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"><MenuIcon size={24} /></button>
                <div><h1 className="text-xl sm:text-2xl font-bold text-gray-800">Riwayat Transaksi</h1><p className="text-gray-500 text-sm hidden sm:block">Daftar semua pesanan yang telah diselesaikan.</p></div>
              </div>
              {transactions.length === 0 ? (
                <div className="text-center text-gray-400 py-20 bg-white rounded-2xl shadow-sm border border-gray-200"><ReceiptText size={48} className="mx-auto mb-3 opacity-30" /><p className="font-medium">Belum ada transaksi tercatat.</p></div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                   <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                        <th className="py-4 px-5 font-bold">ID / Waktu</th>
                        <th className="py-4 px-5 font-bold">Pelanggan/Meja</th>
                        <th className="py-4 px-5 font-bold">Sumber Order</th>
                        <th className="py-4 px-5 font-bold">Total Pembayaran</th>
                        <th className="py-4 px-5 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                      {transactions.map(trx => (
                         <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                           <td className="py-4 px-5"><p className="font-bold">{trx.id}</p><p className="text-[11px] text-gray-500 mt-0.5">{trx.date}</p></td>
                           <td className="py-4 px-5 font-medium">{trx.customer}</td>
                           <td className="py-4 px-5"><span className={`px-2.5 py-1 rounded-md text-xs font-bold ${trx.source === 'Publik' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{trx.source}</span></td>
                           <td className="py-4 px-5 font-bold text-green-600">{formatRp(trx.total)}</td>
                           <td className="py-4 px-5"><span className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded inline-flex"><CheckCircle2 size={14}/> {trx.status}</span></td>
                         </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  };

  const AdminFinance = () => {
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');

    const totalIncome = transactions.reduce((sum, trx) => sum + trx.total, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalIncome - totalExpense;

    const handleAddExpense = async (e) => {
      e.preventDefault();
      if (!desc || !amount) return;
      const newExp = {
        id: `EXP-${Date.now()}`,
        timestamp: Date.now(),
        date: new Date().toLocaleString('id-ID'),
        description: desc,
        amount: Number(amount)
      };

      if (dbUser && db) {
        const basePath = `artifacts/${appId}/users/${dbUser.uid}`;
        await setDoc(doc(db, basePath, 'expenses', newExp.id), newExp);
      } else {
        setExpenses([newExp, ...expenses]);
      }
      setDesc(''); setAmount('');
    };

    const handleDeleteExpense = async (id) => {
      if(confirm('Hapus catatan pengeluaran ini?')) {
        if (dbUser && db) {
          const basePath = `artifacts/${appId}/users/${dbUser.uid}`;
          await deleteDoc(doc(db, basePath, 'expenses', String(id)));
        }
      }
    };

    return (
      <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
             <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"><MenuIcon size={24} /></button>
                <div><h1 className="text-xl sm:text-2xl font-bold text-gray-800">Laporan Keuangan</h1><p className="text-gray-500 text-sm hidden sm:block">Analisa pemasukan dan catat pengeluaran operasional.</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0"><TrendingUp size={28} /></div>
                  <div><p className="text-sm text-gray-500 font-medium">Total Pemasukan</p><h3 className="text-2xl font-black text-gray-800">{formatRp(totalIncome)}</h3></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0"><TrendingDown size={28} /></div>
                  <div><p className="text-sm text-gray-500 font-medium">Total Pengeluaran</p><h3 className="text-2xl font-black text-gray-800">{formatRp(totalExpense)}</h3></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${netProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}><DollarSign size={28} /></div>
                  <div><p className="text-sm text-gray-500 font-medium">Saldo Bersih / Laba</p><h3 className={`text-2xl font-black ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatRp(netProfit)}</h3></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2 border-b pb-3"><Wallet size={20}/> Catat Pengeluaran</h2>
                    <form onSubmit={handleAddExpense} className="space-y-4">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Keterangan Barang/Jasa</label><input required type="text" value={desc} onChange={e=>setDesc(e.target.value)} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-shadow"/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Nominal Biaya (Rp)</label><input required type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-shadow"/></div>
                      <button type="submit" className="w-full bg-red-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-red-600 transition-colors mt-2">Simpan Pengeluaran</button>
                    </form>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
                    <div className="p-5 border-b border-gray-100"><h2 className="font-bold text-gray-800">Riwayat Pengeluaran Operasional</h2></div>
                    <div className="flex-1 overflow-y-auto p-5">
                      {expenses.length === 0 ? <div className="text-center text-gray-400 py-10"><p className="font-medium">Belum ada catatan pengeluaran.</p></div> : (
                        <div className="space-y-3">
                          {expenses.map(exp => (
                            <div key={exp.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                              <div><p className="font-bold text-gray-800">{exp.description}</p><p className="text-xs text-gray-500 mt-0.5">{exp.date}</p></div>
                              <div className="flex items-center gap-4"><span className="font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">- {formatRp(exp.amount)}</span><button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors"><Trash2 size={18} /></button></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    );
  };

  const AdminSettings = () => {
    const [formData, setFormData] = useState(appSettings);

    const handleSave = async (e) => {
      e.preventDefault();
      if (dbUser && db) {
        const basePath = `artifacts/${appId}/users/${dbUser.uid}`;
        await setDoc(doc(db, basePath, 'settings', 'appSettings'), formData);
        alert('Pengaturan berhasil disimpan dan disinkronkan!');
      } else {
        setAppSettings(formData);
        alert('Pengaturan berhasil disimpan secara lokal.');
      }
    };

    return (
      <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto">
             <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"><MenuIcon size={24} /></button>
                <div><h1 className="text-xl sm:text-2xl font-bold text-gray-800">Pengaturan Sistem</h1><p className="text-gray-500 text-sm hidden sm:block">Ubah konfigurasi aplikasi dan kontrol akses.</p></div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-8">
                  
                  {/* --- SAKLAR BUKA / TUTUP TOKO --- */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Operasional Kedai Utama</h3>
                    <div className={`flex items-center justify-between p-5 rounded-xl border-2 transition-colors ${formData.isStoreOpen ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-4">
                        <Store className={formData.isStoreOpen ? "text-green-600" : "text-red-600"} size={32} />
                        <div>
                          <h4 className={`font-black text-lg ${formData.isStoreOpen ? 'text-green-800' : 'text-red-800'}`}>
                            {formData.isStoreOpen ? 'Kedai Sedang BUKA' : 'Kedai Sedang TUTUP'}
                          </h4>
                          <p className={`text-sm ${formData.isStoreOpen ? 'text-green-600' : 'text-red-600'}`}>
                            {formData.isStoreOpen ? 'Pelanggan Publik dapat melakukan pemesanan.' : 'Pelanggan Publik tidak bisa memesan.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, isStoreOpen: !formData.isStoreOpen})}
                        className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none shadow-inner ${formData.isStoreOpen ? 'bg-green-500' : 'bg-red-500'}`}
                      >
                        <span className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition-transform ${formData.isStoreOpen ? 'translate-x-11' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Tampilan Publik Menu Utama</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Judul Sapaan</label><input type="text" value={formData.greetingTitle} onChange={e => setFormData({...formData, greetingTitle: e.target.value})} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Sub-Judul Sapaan</label><input type="text" value={formData.greetingSubtitle} onChange={e => setFormData({...formData, greetingSubtitle: e.target.value})} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Integrasi Pemesanan WhatsApp</h3>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Nomor WhatsApp Kasir (Awali 62)</label><input type="text" value={formData.waNumber} onChange={e => setFormData({...formData, waNumber: e.target.value})} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" placeholder="Contoh: 628123456789"/><p className="text-xs text-gray-500 mt-1">Gunakan format internasional tanpa tanda plus (+). Contoh yang benar: 6281387572560</p></div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Keamanan & Hak Akses (Login PIN)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">PIN Admin (Akses Penuh Semua Menu)</label><input type="text" value={formData.adminPin} onChange={e => setFormData({...formData, adminPin: e.target.value})} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 tracking-widest font-mono text-lg"/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">PIN Pegawai Kasir (Hanya Akses POS)</label><input type="text" value={formData.kasirPin} onChange={e => setFormData({...formData, kasirPin: e.target.value})} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 tracking-widest font-mono text-lg"/></div>
                    </div>
                  </div>
                  
                  <div className="pt-6 flex justify-end border-t border-gray-100">
                    <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"><Settings size={20} /> Terapkan Pengaturan</button>
                  </div>
                </form>
              </div>
          </div>
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (view) {
      case 'public-menu': return <PublicMenu />;
      case 'public-cart': return <PublicCart />;
      case 'public-checkout': return <PublicCheckout />;
      case 'admin-login': return <AdminLogin />;
      case 'admin-dashboard': return currentUser ? <AdminDashboard /> : <AdminLogin />;
      case 'admin-transactions': return currentUser ? <AdminTransactions /> : <AdminLogin />;
      case 'admin-menu': return currentUser === 'admin' ? <AdminMenu /> : <AdminDashboard />;
      case 'admin-finance': return currentUser === 'admin' ? <AdminFinance /> : <AdminDashboard />;
      case 'admin-settings': return currentUser === 'admin' ? <AdminSettings /> : <AdminDashboard />;
      default: return <PublicMenu />;
    }
  };

  return (
    <div className="font-sans text-gray-900 selection:bg-orange-200 relative">
      {renderView()}

      {variantModal.show && variantModal.item && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border border-gray-100">
            <button onClick={() => setVariantModal({ show: false, item: null, context: 'public' })} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 transition-colors bg-gray-100 p-1.5 rounded-full"><X size={20} /></button>
            <h3 className="font-black text-xl text-gray-800 pr-8">{variantModal.item.name}</h3>
            <p className="text-sm text-gray-500 mb-5 mt-1">Silakan pilih varian menu yang diinginkan:</p>
            <div className="space-y-3">
              {variantModal.item.variants.map((variant, idx) => (
                <button key={idx} onClick={() => {
                    if (variantModal.context === 'public') addToCart(variantModal.item, publicCart, setPublicCart, variant);
                    if (variantModal.context === 'admin') addToCart(variantModal.item, adminCart, setAdminCart, variant);
                    setVariantModal({ show: false, item: null, context: 'public' });
                  }} className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all text-left ${variantModal.context === 'public' ? 'border-gray-100 hover:border-orange-500 hover:bg-orange-50' : 'border-gray-100 hover:border-green-500 hover:bg-green-50'}`}>
                  <span className="font-bold text-gray-800">{variant.name}</span>
                  <span className={`font-black ${variantModal.context === 'public' ? 'text-orange-600' : 'text-green-600'}`}>{formatRp(variant.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


```
