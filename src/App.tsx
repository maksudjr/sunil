import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Phone, 
  Hash,
  ChevronRight,
  Scissors,
  LayoutDashboard,
  AlertCircle,
  MapPin
} from 'lucide-react';

// --- Types ---

type Status = 'অপেক্ষায়' | 'অনুমোদিত' | 'সম্পন্ন';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  transactionId: string;
  status: Status;
  timestamp: number;
  approvedAt?: number;
  rating?: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

// --- Constants ---

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '1234'
};

const STORAGE_KEY = 'salon_queue_data_bn_v2';
const SERVICES_STORAGE_KEY = 'salon_services_data';
const ONBOARD_STORAGE_KEY = 'salon_user_onboard';

const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'চুল কাটা', price: 150 },
  { id: '2', name: 'চুল সহ দাড়ি', price: 220 },
  { id: '3', name: 'চুল স্পেশাল', price: 300 },
  { id: '4', name: 'দাড়ি স্পেশাল', price: 200 },
];

const SHOP_NAME = "সুনীল হেয়ার কাটিং";
const SHOP_ADDRESS = "নরুন্দি বাজার, সদর, জামালপুর";

// --- Components ---

export default function App() {
  const [queue, setQueue] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [view, setView] = useState<'user' | 'admin-login' | 'admin-dashboard'>('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [onboardedUser, setOnboardedUser] = useState<{ name: string, mobile: string } | null>(null);

  // Sync Services from Server
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        setServices(data);
      } catch (e) {
        console.error("Error fetching services:", e);
      }
    };
    fetchServices();
    const interval = setInterval(fetchServices, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Sync Queue from Server
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch('/api/queue');
        const data = await res.json();
        setQueue(data);
      } catch (e) {
        console.error("Error fetching queue:", e);
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000); // Poll every 3s for live updates
    return () => clearInterval(interval);
  }, []);

  // Load onboarded user from LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem(ONBOARD_STORAGE_KEY);
    if (savedUser) {
      try { setOnboardedUser(JSON.parse(savedUser)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (onboardedUser) {
      localStorage.setItem(ONBOARD_STORAGE_KEY, JSON.stringify(onboardedUser));
    }
  }, [onboardedUser]);

  // Derived State
  const activeQueue = useMemo(() => 
    queue.filter(c => c.status !== 'সম্পন্ন')
         .sort((a, b) => {
           // Approved comes first
           if (a.status === 'অনুমোদিত' && b.status !== 'অনুমোদিত') return -1;
           if (a.status !== 'অনুমোদিত' && b.status === 'অনুমোদিত') return 1;
           // Then by timestamp
           return a.timestamp - b.timestamp;
         }), 
  [queue]);

  const nowServing = useMemo(() => 
    activeQueue.find(c => c.status === 'অনুমোদিত'), 
  [activeQueue]);

  const waitingList = useMemo(() => 
    activeQueue.filter(c => c.status === 'অপেক্ষায়'), 
  [activeQueue]);

  // --- Actions ---

  const handleAddCustomer = async (serviceId: string, transactionId: string) => {
    if (!onboardedUser) return;
    if (waitingList.length >= 15) {
      alert("দুঃখিত, বর্তমানে ওয়েটিং লিস্ট পূর্ণ (সর্বোচ্চ ১৫ জন)। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।");
      return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const newCustomer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name: onboardedUser.name,
      mobile: onboardedUser.mobile,
      serviceId: service.id,
      serviceName: service.name,
      amount: service.price,
      transactionId,
      status: 'অপেক্ষায়',
      timestamp: Date.now()
    };

    try {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      setQueue(prev => [...prev, newCustomer]);
      setCurrentUser(newCustomer);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateServicePrice = async (id: string, newPrice: number) => {
    try {
      await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      });
      setServices(prev => prev.map(s => s.id === id ? { ...s, price: newPrice } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'অনুমোদিত', approvedAt: Date.now() })
      });
      setQueue(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'অনুমোদিত', approvedAt: Date.now() } : c
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRate = async (id: string, rating: number) => {
    try {
      await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      setQueue(prev => prev.map(c => 
        c.id === id ? { ...c, rating } : c
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      // Delete after complete as requested
      await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      setQueue(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (user: string, pass: string) => {
    if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
      setIsAdmin(true);
      setView('admin-dashboard');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setView('user');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-amber-500/20 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
              <Scissors className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight text-amber-400 leading-tight">{SHOP_NAME}</h1>
              <p className="text-xs text-amber-500/60 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {SHOP_ADDRESS}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {view === 'user' && (
              <button 
                onClick={() => setView('admin-login')}
                className="text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30"
              >
                <LogIn className="w-4 h-4" />
                অ্যাডমিন প্যানেল
              </button>
            )}
            {isAdmin && view === 'admin-dashboard' && (
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
                লগআউট
              </button>
            )}
            {view === 'admin-login' && (
              <button 
                onClick={() => setView('user')}
                className="text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30"
              >
                বুকিং পেজে ফিরুন
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        <AnimatePresence mode="wait">
          {!onboardedUser && view === 'user' ? (
            <WelcomeScreen onComplete={(name, mobile) => setOnboardedUser({ name, mobile })} />
          ) : view === 'user' ? (
            <motion.div
              key="user-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Welcome Message */}
              <div className="text-center mb-4">
                <h2 className="text-2xl font-display font-bold text-amber-400">স্বাগতম, {onboardedUser?.name}!</h2>
                <p className="text-slate-400">সুনীল হেয়ার কাটিং-এ আপনাকে স্বাগতম। আপনার কাঙ্ক্ষিত সার্ভিসটি বেছে নিন।</p>
              </div>

              {/* Now Serving Banner */}
              {nowServing && (
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-amber-500 rounded-2xl p-6 text-black shadow-xl shadow-amber-500/20 flex items-center justify-between overflow-hidden relative"
                >
                  <div className="relative z-10">
                    <p className="text-black/60 text-sm font-medium uppercase tracking-wider mb-1">এখন সেবা দেওয়া হচ্ছে</p>
                    <h2 className="text-3xl font-display font-bold">{nowServing.name}</h2>
                    <div className="flex items-center gap-2 mt-2 text-black/70">
                      <Hash className="w-4 h-4" />
                      <span className="font-mono font-medium">সিরিয়াল #১ ({nowServing.serviceName})</span>
                    </div>
                  </div>
                  <div className="relative z-10 bg-black/10 p-4 rounded-full backdrop-blur-sm">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                    <Scissors className="w-32 h-32 rotate-12" />
                  </div>
                </motion.div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                {/* Booking Form */}
                <section className="bg-slate-900 p-6 rounded-2xl border border-amber-500/20 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <UserPlus className="w-5 h-5 text-amber-500" />
                    <h3 className="font-display font-semibold text-lg text-amber-400">সার্ভিস সিলেক্ট করুন</h3>
                  </div>
                  
                  <BookingForm services={services} onSubmit={handleAddCustomer} />
                </section>

                {/* Status Section */}
                <section className="space-y-6">
                  {currentUser ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500/30 shadow-lg"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-amber-400">আপনার বর্তমান অবস্থা</h4>
                          <p className="text-sm text-slate-400">{currentUser.name} ({currentUser.serviceName})</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          currentUser.status === 'অনুমোদিত' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {currentUser.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-slate-800 p-4 rounded-xl text-center border border-amber-500/10">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">আপনার অবস্থান</p>
                          <p className="text-2xl font-display font-bold text-amber-500">
                            {activeQueue.findIndex(c => c.id === currentUser.id) + 1}
                          </p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl text-center border border-amber-500/10">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">অপেক্ষার সময়</p>
                          <div className="text-2xl font-display font-bold text-slate-300">
                            {currentUser.status === 'অনুমোদিত' ? (
                              <CountdownTimer startTime={currentUser.approvedAt!} />
                            ) : (
                              <EstimatedWait 
                                startTime={nowServing?.approvedAt || Date.now()} 
                                position={activeQueue.findIndex(c => c.id === currentUser.id) + (nowServing ? 0 : 1)} 
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {currentUser.status === 'সম্পন্ন' && !currentUser.rating && (
                        <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          <p className="text-sm font-bold text-amber-400 mb-2 text-center">আপনার অভিজ্ঞতা কেমন ছিল?</p>
                          <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button 
                                key={star}
                                onClick={() => handleRate(currentUser.id, star)}
                                className="text-2xl hover:scale-110 transition-transform"
                              >
                                ⭐
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentUser.rating && (
                        <div className="mt-6 text-center text-sm text-green-400 font-bold">
                          রেটিং দেওয়ার জন্য ধন্যবাদ! (রেটিং: {currentUser.rating}⭐)
                        </div>
                      )}

                      <button 
                        onClick={() => setCurrentUser(null)}
                        className="w-full mt-6 text-sm text-slate-500 hover:text-amber-400 transition-colors font-medium underline underline-offset-4"
                      >
                        অন্য সার্ভিস বুক করুন
                      </button>
                    </motion.div>
                  ) : (
                    <div className="bg-slate-900 p-8 rounded-2xl border border-dashed border-amber-500/20 flex flex-col items-center justify-center text-center">
                      <Clock className="w-10 h-10 text-amber-500/20 mb-3" />
                      <p className="text-slate-500 font-medium">সার্ভিস সিলেক্ট করে পেমেন্ট করলে এখানে আপনার সিরিয়াল নম্বর দেখতে পাবেন।</p>
                    </div>
                  )}

                  {/* Waiting List Panel */}
                  <section className="bg-slate-900 p-6 rounded-2xl border border-amber-500/20 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <h3 className="font-display font-semibold text-lg text-amber-400">ওয়েটিং লিস্ট (সর্বোচ্চ ১৫)</h3>
                      </div>
                      <span className="text-xs font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg border border-amber-500/20">
                        {waitingList.length}/১৫
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {waitingList.length > 0 ? (
                        waitingList.map((customer, index) => (
                          <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-amber-500/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center font-bold text-amber-500/40 text-sm border border-amber-500/20">
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-200">{customer.name}</p>
                                <p className="text-[10px] text-slate-500">{customer.serviceName} | সিরিয়াল #{queue.findIndex(q => q.id === customer.id) + 1}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">অপেক্ষার সময়</p>
                              <p className="text-sm font-mono font-bold text-amber-500">
                                {nowServing ? (
                                  <EstimatedWait startTime={nowServing.approvedAt!} position={index + 1} />
                                ) : (
                                  <span>{(index + 1) * 30}:00</span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-8 text-slate-500 text-sm italic">বর্তমানে কেউ অপেক্ষায় নেই</p>
                      )}
                    </div>
                  </section>

                  {/* Quick Stats */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-amber-500/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-amber-500/40" />
                      <h3 className="font-display font-semibold text-lg text-amber-400">সিরিয়াল ওভারভিউ</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">মোট অপেক্ষায়</span>
                        <span className="font-bold text-amber-400">{waitingList.length} জন</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">আনুমানিক অপেক্ষার সময়</span>
                        <span className="font-bold text-amber-400">{waitingList.length * 30} মিনিট</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          ) : null}

          {view === 'admin-login' && (
            <motion.div
              key="admin-login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto mt-12"
            >
              <div className="bg-slate-900 p-8 rounded-2xl border border-amber-500/20 shadow-xl">
                <div className="text-center mb-8">
                  <div className="bg-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                    <LayoutDashboard className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-amber-400">অ্যাডমিন লগইন</h2>
                  <p className="text-slate-500">সিরিয়াল ম্যানেজমেন্ট ড্যাশবোর্ড অ্যাক্সেস করুন</p>
                </div>
                
                <AdminLoginForm onLogin={handleLogin} />
              </div>
            </motion.div>
          )}

          {view === 'admin-dashboard' && (
            <motion.div
              key="admin-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-display font-bold text-amber-400">সিরিয়াল ম্যানেজমেন্ট</h2>
                  <p className="text-slate-500">গ্রাহকদের তালিকা এবং সেবা প্রদানের অবস্থা পরিচালনা করুন</p>
                </div>
                <div className="bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                  <span className="text-amber-500 font-bold">{activeQueue.length}</span>
                  <span className="text-amber-500/60 text-sm ml-2">সক্রিয়</span>
                </div>
              </div>

              {/* Service Price Management */}
              <section className="bg-slate-900 p-6 rounded-2xl border border-amber-500/20 shadow-sm">
                <h3 className="font-display font-bold text-lg text-amber-400 mb-4">সার্ভিস ও মূল্য তালিকা</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {services.map(service => (
                    <div key={service.id} className="bg-slate-800 p-4 rounded-xl border border-amber-500/10">
                      <p className="text-sm font-bold text-slate-300 mb-2">{service.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500 font-bold">৳</span>
                        <input 
                          type="number" 
                          value={service.price}
                          onChange={(e) => handleUpdateServicePrice(service.id, parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-amber-500/20 rounded-lg px-2 py-1 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {activeQueue.length > 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-amber-500/20 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-800/50 border-b border-amber-500/20">
                          <th className="px-6 py-4 text-xs font-bold text-amber-500/40 uppercase tracking-wider">সিরিয়াল</th>
                          <th className="px-6 py-4 text-xs font-bold text-amber-500/40 uppercase tracking-wider">গ্রাহক ও পেমেন্ট</th>
                          <th className="px-6 py-4 text-xs font-bold text-amber-500/40 uppercase tracking-wider">অবস্থা ও সময়</th>
                          <th className="px-6 py-4 text-xs font-bold text-amber-500/40 uppercase tracking-wider text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-500/10">
                        {activeQueue.map((customer, index) => (
                          <motion.tr 
                            layout
                            key={customer.id}
                            className={`${customer.status === 'অনুমোদিত' ? 'bg-amber-500/5' : 'hover:bg-slate-800/30'} transition-colors`}
                          >
                            <td className="px-6 py-4">
                              <span className={`font-mono font-bold ${customer.status === 'অনুমোদিত' ? 'text-amber-400' : 'text-slate-600'}`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-200">{customer.name}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {customer.mobile}
                                </span>
                                <span className="text-[10px] text-amber-500 font-bold mt-1">
                                  {customer.serviceName} | ৳{customer.amount} | Trx: {customer.transactionId}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                                  customer.status === 'অনুমোদিত' 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {customer.status === 'অনুমোদিত' ? 'সেবা দেওয়া হচ্ছে' : 'অপেক্ষায়'}
                                </span>
                                {customer.status === 'অনুমোদিত' && customer.approvedAt && (
                                  <div className="text-xs font-mono font-bold text-slate-400">
                                    <CountdownTimer startTime={customer.approvedAt} />
                                  </div>
                                )}
                                {customer.rating && (
                                  <span className="text-xs text-amber-500 font-bold">রেটিং: {customer.rating}⭐</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {customer.status === 'অপেক্ষায়' && (
                                  <button 
                                    onClick={() => handleApprove(customer.id)}
                                    className="p-2 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/20"
                                    title="অনুমোদন করুন"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleMarkDone(customer.id)}
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
                                  title="সম্পন্ন করুন"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 p-12 rounded-2xl border border-amber-500/20 text-center">
                  <Users className="w-12 h-12 text-amber-500/20 mx-auto mb-4" />
                  <h3 className="text-lg font-display font-bold text-amber-400">বর্তমানে কোনো গ্রাহক নেই</h3>
                  <p className="text-slate-500">সিরিয়াল তালিকা বর্তমানে খালি।</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-amber-500/20 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">© ২০২৪ {SHOP_NAME} - সিরিয়াল ম্যানেজমেন্ট সিস্টেম</p>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---

function WelcomeScreen({ onComplete }: { onComplete: (name: string, mobile: string) => void }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && mobile.trim()) {
      onComplete(name, mobile);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto mt-12 bg-slate-900 p-8 rounded-2xl border border-amber-500/20 shadow-2xl"
    >
      <div className="text-center mb-8">
        <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
          <Scissors className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-3xl font-display font-bold text-amber-400">সুনীল হেয়ার কাটিং</h2>
        <p className="text-slate-400 mt-2">সিরিয়ালে যোগ দিতে আপনার তথ্য প্রদান করুন</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-amber-500/60 uppercase mb-2 ml-1">আপনার নাম</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/40" />
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="নাম লিখুন"
              className="w-full pl-10 pr-4 py-4 bg-slate-950 border border-amber-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-amber-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-amber-500/60 uppercase mb-2 ml-1">মোবাইল নম্বর</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/40" />
            <input 
              type="tel" 
              required
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="মোবাইল নম্বর"
              className="w-full pl-10 pr-4 py-4 bg-slate-950 border border-amber-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-amber-100"
            />
          </div>
        </div>
        <button 
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 rounded-xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          প্রবেশ করুন
          <ChevronRight className="w-5 h-5" />
        </button>
      </form>
    </motion.div>
  );
}

function BookingForm({ services, onSubmit }: { services: Service[], onSubmit: (serviceId: string, trx: string) => void }) {
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [trx, setTrx] = useState('');

  const selectedService = services.find(s => s.id === selectedServiceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceId && trx.trim()) {
      onSubmit(selectedServiceId, trx);
      setTrx('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="block text-xs font-bold text-amber-500/60 uppercase mb-1.5 ml-1">সার্ভিস নির্বাচন করুন</label>
        <div className="grid grid-cols-1 gap-3">
          {services.map(service => (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelectedServiceId(service.id)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                selectedServiceId === service.id 
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10' 
                  : 'bg-slate-950 border-amber-500/10 text-slate-400 hover:border-amber-500/30'
              }`}
            >
              <span className="font-bold">{service.name}</span>
              <span className="font-mono font-bold">৳{service.price}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
        <p className="text-xs text-amber-500/60 uppercase font-bold mb-2">পেমেন্ট ইনস্ট্রাকশন</p>
        <div className="text-sm text-slate-300 space-y-2">
          <p>১. বিকাশে ঢুকে <span className="text-amber-400 font-bold">সেন্ড মানি</span> সিলেক্ট করুন।</p>
          <p>২. <span className="text-amber-400 font-bold">014xxxxxxxxxx</span> নাম্বারে <span className="text-amber-400 font-bold">৳{selectedService?.price}</span> সেন্ট মানি করুন।</p>
          <p>৩. রেফারেন্স অপশনে <span className="text-amber-400 font-bold">আপনার নাম</span> লিখুন।</p>
          <p>৪. ট্রানজেকশন আইডি নিচে বসিয়ে সাবমিট করুন।</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-amber-500/60 uppercase mb-2 ml-1">ট্রানজেকশন আইডি</label>
        <input 
          type="text" 
          required
          value={trx}
          onChange={e => setTrx(e.target.value)}
          placeholder="TrxID বসান"
          className="w-full px-4 py-4 bg-slate-950 border border-amber-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-amber-100 font-mono"
        />
      </div>

      <button 
        type="submit"
        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 rounded-xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        সিরিয়ালে যোগ দিন
        <ChevronRight className="w-5 h-5" />
      </button>
    </form>
  );
}

function CountdownTimer({ startTime }: { startTime: number }) {
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, (30 * 60) - elapsed);
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <span className={timeLeft < 300 ? 'text-red-500' : ''}>
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

function EstimatedWait({ startTime, position }: { startTime: number, position: number }) {
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, (30 * 60) - elapsed);
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const totalSeconds = (position - 1) * 30 * 60 + timeLeft;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return (
    <span>
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

function AdminLoginForm({ onLogin }: { onLogin: (u: string, p: string) => boolean }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-bold text-amber-500/60 uppercase mb-2 ml-1">ইউজারনেম</label>
        <input 
          type="text" 
          required
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full px-4 py-4 bg-slate-950 border border-amber-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-amber-100"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-amber-500/60 uppercase mb-2 ml-1">পাসওয়ার্ড</label>
        <input 
          type="password" 
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-4 bg-slate-950 border border-amber-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-amber-100"
        />
      </div>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20"
        >
          <AlertCircle className="w-4 h-4" />
          ভুল ইউজারনেম বা পাসওয়ার্ড। আবার চেষ্টা করুন।
        </motion.div>
      )}

      <button 
        type="submit"
        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-xl shadow-amber-500/20"
      >
        লগইন করুন
      </button>
      
      <div className="mt-6 p-4 bg-slate-950 rounded-xl border border-amber-500/10 text-xs text-slate-500">
        <p className="font-bold uppercase mb-1 text-amber-500/60">ডেমো লগইন তথ্য</p>
        <p>ইউজার: admin</p>
        <p>পাস: 1234</p>
      </div>
    </form>
  );
}
