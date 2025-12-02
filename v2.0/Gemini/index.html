import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  Activity, 
  Plus, 
  TrendingUp, 
  Brain, 
  Trophy, 
  AlertCircle, 
  Flame, 
  Trash2,
  Save,
  Dumbbell,
  BookOpen
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Helper Functions ---
const getLevel = (hours) => {
  if (hours < 10) return { name: "Rookie", color: "text-slate-400", next: 10 };
  if (hours < 50) return { name: "Prospect", color: "text-emerald-400", next: 50 };
  if (hours < 150) return { name: "Contender", color: "text-blue-400", next: 150 };
  if (hours < 500) return { name: "State Champ", color: "text-amber-400", next: 500 };
  return { name: "All-American", color: "text-rose-500", next: 1000 };
};

const formatDate = (dateObj) => {
  if (!dateObj) return '';
  const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Components ---

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
    <div className="flex flex-col items-center gap-4">
      <Activity className="w-12 h-12 animate-pulse text-amber-500" />
      <p>Warming up...</p>
    </div>
  </div>
);

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${
      active ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'
    }`}
  >
    <Icon className="w-6 h-6 mb-1" />
    <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
  </button>
);

const ProgressBar = ({ current, max, colorClass = "bg-amber-500" }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ${colorClass}`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard, log, journal, insights
  
  // Log Form State
  const [logForm, setLogForm] = useState({
    duration: 90,
    type: 'Practice',
    intensity: 3,
    wins: '',
    fixes: '',
    tags: ''
  });

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth failed:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSessions(data);
        setLoading(false);
      }, 
      (error) => {
        console.error("Data fetch error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- Core Logic ---

  const handleLogSubmit = async () => {
    if (!user) return;
    
    const newSession = {
      createdAt: serverTimestamp(),
      date: new Date().toISOString(),
      duration: Number(logForm.duration),
      type: logForm.type,
      intensity: logForm.intensity,
      wins: logForm.wins,
      fixes: logForm.fixes,
      tags: logForm.tags.split(',').map(t => t.trim()).filter(t => t),
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'), newSession);
      setLogForm({ duration: 90, type: 'Practice', intensity: 3, wins: '', fixes: '', tags: '' });
      setView('dashboard');
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete this session?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', id));
    } catch (e) {
      console.error("Error deleting: ", e);
    }
  };

  // --- Derived Metrics ---
  const totalHours = useMemo(() => sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60, [sessions]);
  const currentLevel = useMemo(() => getLevel(totalHours), [totalHours]);
  const sessionsThisWeek = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return sessions.filter(s => {
      const sDate = s.createdAt ? s.createdAt.toDate() : new Date(s.date);
      return sDate > oneWeekAgo;
    });
  }, [sessions]);

  // Insights Logic
  const insights = useMemo(() => {
    const fixCounts = {};
    const winCounts = {};
    
    sessions.forEach(s => {
      // Very basic NLP simulation: splitting by commas or newlines
      if (s.fixes) {
        s.fixes.split(/[,.\n]/).forEach(phrase => {
          const p = phrase.trim().toLowerCase();
          if (p.length > 3) fixCounts[p] = (fixCounts[p] || 0) + 1;
        });
      }
    });

    const topFixes = Object.entries(fixCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([text, count]) => ({ text, count }));

    return { topFixes };
  }, [sessions]);

  if (loading) return <LoadingScreen />;

  // --- Views ---

  const DashboardView = () => (
    <div className="space-y-6 animate-fade-in p-4 pb-24">
      {/* Header / Level */}
      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy className="w-24 h-24 text-amber-500" />
        </div>
        <div className="relative z-10">
          <h2 className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-1">Current Status</h2>
          <h1 className={`text-3xl font-black ${currentLevel.color} mb-2`}>{currentLevel.name}</h1>
          
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-light text-white">{totalHours.toFixed(1)}</span>
            <span className="text-slate-500 font-medium mb-1">total mat hours</span>
          </div>
          
          <ProgressBar current={totalHours} max={currentLevel.next} />
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{Math.floor(totalHours)} hrs</span>
            <span>Next Rank: {currentLevel.next} hrs</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <Flame className="text-orange-500 w-5 h-5" />
            <span className="text-slate-500 text-xs font-bold">7 DAYS</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-white">{sessionsThisWeek.length}</span>
            <span className="text-slate-400 text-sm ml-1">sessions</span>
          </div>
        </div>
        
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <Brain className="text-purple-500 w-5 h-5" />
            <span className="text-slate-500 text-xs font-bold">INSIGHTS</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-white">{insights.topFixes.length}</span>
            <span className="text-slate-400 text-sm ml-1">patterns found</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Mini */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">Recent Mat Time</h3>
          <button onClick={() => setView('journal')} className="text-amber-500 text-sm font-medium">View All</button>
        </div>
        <div className="space-y-3">
          {sessions.slice(0, 3).map(session => (
            <div key={session.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                session.intensity >= 4 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'
              }`}>
                {session.intensity >= 4 ? <Activity className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">{session.type}</span>
                  <span className="text-slate-500 text-xs">{formatDate(session.createdAt)}</span>
                </div>
                <div className="text-slate-400 text-sm truncate w-48">
                  {session.fixes || session.wins || "No notes"}
                </div>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
              No sessions yet. Hit the + to start your journey.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const LogView = () => (
    <div className="p-4 pb-24 max-w-lg mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Log Session</h2>
      
      <div className="space-y-6">
        {/* Type & Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-slate-400 text-xs uppercase font-bold">Type</label>
            <select 
              value={logForm.type}
              onChange={e => setLogForm({...logForm, type: e.target.value})}
              className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-700 focus:border-amber-500 outline-none"
            >
              <option>Practice</option>
              <option>Drilling</option>
              <option>Live Wrestling</option>
              <option>Conditioning</option>
              <option>Competition</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-slate-400 text-xs uppercase font-bold">Duration (Min)</label>
            <input 
              type="number" 
              value={logForm.duration}
              onChange={e => setLogForm({...logForm, duration: e.target.value})}
              className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-700 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Intensity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-slate-400 text-xs uppercase font-bold">Intensity (RPE)</label>
            <span className={`text-xs font-bold ${
              logForm.intensity <= 2 ? 'text-emerald-400' : logForm.intensity <= 4 ? 'text-amber-400' : 'text-red-500'
            }`}>
              {logForm.intensity}/5
            </span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="5" 
            value={logForm.intensity}
            onChange={e => setLogForm({...logForm, intensity: Number(e.target.value)})}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 px-1">
            <span>Light</span>
            <span>Grueling</span>
          </div>
        </div>

        {/* The Meat: Wins & Fixes */}
        <div className="space-y-2">
          <label className="text-slate-400 text-xs uppercase font-bold flex items-center gap-2">
            <Trophy className="w-3 h-3 text-amber-500" />
            What went well? (Wins)
          </label>
          <textarea 
            placeholder="Hit that low single perfectly. Mentally stayed in the fight..."
            value={logForm.wins}
            onChange={e => setLogForm({...logForm, wins: e.target.value})}
            className="w-full h-24 bg-slate-800 text-white p-3 rounded-xl border border-slate-700 focus:border-amber-500 outline-none resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-slate-400 text-xs uppercase font-bold flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-red-400" />
            What needs work? (Fixes)
          </label>
          <textarea 
            placeholder="Got turned on bottom. Head position was weak in tie-ups..."
            value={logForm.fixes}
            onChange={e => setLogForm({...logForm, fixes: e.target.value})}
            className="w-full h-24 bg-slate-800 text-white p-3 rounded-xl border border-slate-700 focus:border-amber-500 outline-none resize-none"
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-slate-400 text-xs uppercase font-bold">Tags (Comma separated)</label>
          <input 
            type="text" 
            placeholder="Single leg, Bottom, Defense"
            value={logForm.tags}
            onChange={e => setLogForm({...logForm, tags: e.target.value})}
            className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-700 focus:border-amber-500 outline-none"
          />
        </div>

        <button 
          onClick={handleLogSubmit}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <Save className="w-5 h-5" />
          Log Session
        </button>
      </div>
    </div>
  );

  const JournalView = () => (
    <div className="p-4 pb-24 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Mat Journal</h2>
      <div className="space-y-4">
        {sessions.map(session => (
          <div key={session.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 relative group">
            <button 
              onClick={() => handleDelete(session.id)}
              className="absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
               <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                 session.type === 'Competition' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-700 text-slate-300'
               }`}>
                 {session.type}
               </div>
               <span className="text-slate-500 text-xs">{formatDate(session.createdAt)}</span>
               <span className="text-slate-500 text-xs">• {session.duration} min</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {session.wins && (
                <div>
                  <h4 className="text-emerald-400 text-xs font-bold uppercase mb-1">Wins</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{session.wins}</p>
                </div>
              )}
              {session.fixes && (
                <div>
                  <h4 className="text-rose-400 text-xs font-bold uppercase mb-1">Fixes</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{session.fixes}</p>
                </div>
              )}
            </div>

            {session.tags && session.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700/50">
                {session.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const InsightsView = () => (
    <div className="p-4 pb-24 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Coach's Corner</h2>
      
      {/* Actionable Feedback Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-indigo-400 w-8 h-8" />
          <h3 className="text-xl font-bold text-white">Analysis</h3>
        </div>
        
        {insights.topFixes.length > 0 ? (
          <div className="space-y-4">
            <p className="text-indigo-100 text-sm">
              I've noticed a pattern in your "Fixes". You're consistently struggling with these areas. 
              Let's turn these into drilling priorities for next practice.
            </p>
            <ul className="space-y-3">
              {insights.topFixes.map((item, idx) => (
                <li key={idx} className="bg-indigo-950/50 p-3 rounded-lg flex justify-between items-center border border-indigo-500/20">
                  <span className="text-indigo-200 font-medium capitalize">{item.text}</span>
                  <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full">Reported {item.count}x</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-indigo-200 text-sm italic">
            Not enough data yet. Log a few more sessions with detailed "Fixes" to get personalized technical feedback.
          </p>
        )}
      </div>

      {/* Volume Check */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          Volume Check
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Avg Intensity (Last 5)</span>
            <span className="text-white font-mono font-bold">
              {sessions.length > 0 
                ? (sessions.slice(0,5).reduce((a,c) => a+c.intensity, 0) / Math.min(5, sessions.length)).toFixed(1) 
                : 0}
               / 5
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Weekly Mat Hours</span>
            <span className="text-white font-mono font-bold">
              {sessionsThisWeek.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60} hrs
            </span>
          </div>
          
          <div className="p-3 bg-slate-900/50 rounded-lg text-xs text-slate-500 leading-relaxed mt-2">
             {sessionsThisWeek.length > 4 ? 
               "🔥 High volume week! Make sure you are prioritizing recovery and sleep." : 
               "Consistency is key. Try to get on the mat one more time this week."}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-amber-500 selection:text-slate-900">
      
      {/* Main View Area */}
      <div className="max-w-md mx-auto min-h-screen relative bg-slate-900 shadow-2xl overflow-hidden">
        {view === 'dashboard' && <DashboardView />}
        {view === 'log' && <LogView />}
        {view === 'journal' && <JournalView />}
        {view === 'insights' && <InsightsView />}

        {/* Floating Action Button (if not on log screen) */}
        {view !== 'log' && (
          <button 
            onClick={() => setView('log')}
            className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full shadow-lg shadow-amber-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-50"
          >
            <Plus className="w-8 h-8" />
          </button>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-50">
          <div className="max-w-md mx-auto flex justify-around items-center">
            <TabButton 
              active={view === 'dashboard'} 
              icon={TrendingUp} 
              label="Progress" 
              onClick={() => setView('dashboard')} 
            />
            <TabButton 
              active={view === 'journal'} 
              icon={BookOpen} 
              label="Journal" 
              onClick={() => setView('journal')} 
            />
            <TabButton 
              active={view === 'insights'} 
              icon={Brain} 
              label="Insights" 
              onClick={() => setView('insights')} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}