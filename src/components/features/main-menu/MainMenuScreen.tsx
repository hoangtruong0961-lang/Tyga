
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Play, 
  RotateCcw, 
  Upload,
  X,
  Clock,
  FileText,
  Trash2,
  CheckCircle,
  Download,
  Database,
  Settings,
  DownloadCloud,
  Users,
  Info,
  MessageCircle,
  Heart,
  Tags,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HardDrive,
  ArrowLeft,
  Palette,
  Paintbrush
} from 'lucide-react';
import { useDatabaseStatus } from '../../../hooks/useDatabaseStatus';
import { useTheme } from '../../../context/ThemeContext';
import { NavigationProps, GameState, SaveFile, WorldData, AppSettings } from '../../../types';
import { dbService, DEFAULT_SETTINGS } from '../../../services/db/indexedDB';
import { CharacterLibraryScreen } from './CharacterLibraryScreen';
import { ArkLogo } from '../../ui/ArkLogo';
import { CHANGELOG_DATA } from '../../../data/changelog';

import { AnimatedBackground } from './AnimatedBackground';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } }
};

const MainMenuScreen: React.FC<NavigationProps> = ({ onNavigate, onGameStart }) => {
  const { 
    theme, 
    setTheme, 
    useCustomTheme, 
    setUseCustomTheme, 
    customThemes, 
    activeCustomThemeId, 
    setActiveCustomThemeId 
  } = useTheme();
  
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [isIntroing, setIsIntroing] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroing(false);
    }, 2500); // 2.5s loading screen
    return () => clearTimeout(timer);
  }, []);

  const { hasSaves } = useDatabaseStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCharacterLibrary, setShowCharacterLibrary] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoActiveTab, setInfoActiveTab] = useState<'info' | 'changelog'>('info');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [saveList, setSaveList] = useState<SaveFile[]>([]);
  const manualSaves = saveList.filter(s => !s.isAutosave);
  const autoSaves = saveList.filter(s => s.isAutosave);
  const [activeSaveTab, setActiveSaveTab] = useState<'manual' | 'autosave'>('manual');
  
  // Toast State (Auto Dismiss)
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Background Image State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgBlur] = useState<boolean>(dbService.getKeyValueSync('ark_v2_bg_blur') !== false && dbService.getKeyValueSync('ark_v2_bg_blur') !== 'false'); // Default to true
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // API Status & Storage Usage for Parameter HUD
  const [storageUsage, setStorageUsage] = useState<string>('Đang tính...');
  const [apiStatus, setApiStatus] = useState<{
    text: string;
    isActive: boolean;
    type: 'proxy' | 'key' | 'none';
  }>({ text: 'Đang kiểm tra...', isActive: false, type: 'none' });

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((estimate.quota || 0) / (1024 * 1024 * 1024)).toFixed(1);
        setStorageUsage(`${usageMB} MB / ${quotaMB} GB`);
      }).catch(() => {
        setStorageUsage('Chưa xác định');
      });
    } else {
      setTimeout(() => {
        setStorageUsage('Không hỗ trợ estimate');
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!settings) return;
    
    // Check if there is an active proxy in settings
    let isProxyActive = false;
    let proxyName = '';
    
    const activeProxy = settings.proxies?.find(p => p.id === settings.activeProxyId);
    if (activeProxy && activeProxy.url && activeProxy.key) {
      isProxyActive = true;
      proxyName = activeProxy.name || 'Custom Proxy';
    } else if (settings.proxyEnabled && settings.proxyUrl && settings.proxyKey) {
      isProxyActive = true;
      proxyName = settings.proxyName || 'Legacy Proxy';
    }
    
    if (isProxyActive) {
      setTimeout(() => {
        setApiStatus({
          text: `Proxy hoạt động: ${proxyName}`,
          isActive: true,
          type: 'proxy'
        });
      }, 0);
      return;
    }
    
    // Check if there is a personal API key
    if (settings.useGeminiApi !== false && settings.geminiApiKey && Array.isArray(settings.geminiApiKey)) {
      const keys = settings.geminiApiKey.filter(k => k && k.trim() !== "" && k !== "YOUR_API_KEY");
      if (keys.length > 0) {
        setTimeout(() => {
          setApiStatus({
            text: `Gemini API sẵn sàng (${keys.length} Key)`,
            isActive: true,
            type: 'key'
          });
        }, 0);
        return;
      }
    }
    
    // Check if environment API key is available
    const safeEnv = (typeof process !== "undefined" && process?.env) ? process.env : {};
    const hasEnvKey = !!(safeEnv?.API_KEY || safeEnv?.GEMINI_API_KEY);
    if (hasEnvKey) {
      setTimeout(() => {
        setApiStatus({
          text: 'Sử dụng hệ thống tự động (Server ENV Key)',
          isActive: true,
          type: 'key'
        });
      }, 0);
      return;
    }
    
    setTimeout(() => {
      setApiStatus({
        text: 'Chưa cài đặt API Key hoặc Proxy',
        isActive: false,
        type: 'none'
      });
    }, 0);
  }, [settings]);

  // Load Background Image and Settings from IndexedDB
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Load Background
      const savedBg = await dbService.getAsset('ark_v2_custom_bg');
      if (savedBg) {
        setBgImage(savedBg);
      } else {
        const legacyBg = await dbService.getAsset('ark_v1_custom_bg') || dbService.getKeyValueSync('ark_v1_custom_bg');
        if (legacyBg) {
          setBgImage(legacyBg);
          await dbService.saveAsset('ark_v2_custom_bg', legacyBg);
          // Keep old one for safety or remove it? I'll keep it for now but use v2 as primary
        }
      }

      // Load Settings
      const savedSettings = await dbService.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    };
    loadData();
  }, []);

  // Toast Timer
  useEffect(() => {
    if (toast.show) {
        const timer = setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000); // 3 seconds
        return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // --- Import Logic ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const fileContent = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      });

      try {
        const parsedData = JSON.parse(fileContent);
        let worldData: WorldData | null = null;
        
        // CASE 1: File Save Gameplay
        if (parsedData.savedState && parsedData.world && parsedData.player) {
          worldData = parsedData as WorldData;
        }
        // CASE 2: Legacy/Alternative Structure
        else if (parsedData.history && parsedData.world && parsedData.world.player) {
          worldData = {
            ...parsedData.world,
            savedState: {
              history: parsedData.history,
              turnCount: parsedData.turnCount || 0
            }
          };
        }
        // CASE 3: Setup File
        else if (parsedData.player && parsedData.world && parsedData.config && !parsedData.savedState) {
          // Setup files don't have savedState, we can still import them as "Manual Save" with 0 turns
          worldData = {
            ...parsedData,
            savedState: { history: [], turnCount: 0 }
          } as WorldData;
        }

        if (worldData) {
          const saveId = `manual-import-${Date.now()}-${i}`;
          await dbService.saveGameState({
            id: saveId,
            name: `[Nhập] ${file.name.replace('.json', '')}`,
            updatedAt: Date.now(),
            data: worldData
          });
          successCount++;
        }
      } catch (error) {
        console.error("Import error:", error);
      }
    }

    // Refresh list
    const saves = await dbService.getAllSaves();
    saves.sort((a, b) => b.updatedAt - a.updatedAt);
    setSaveList(saves);

    if (successCount > 0) {
      setToast({ show: true, message: `Đã nhập thành công ${successCount} tệp lưu!` });
    }
    
    event.target.value = '';
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // --- Load Game Logic ---
  const handleOpenLoadGame = async () => {
      const saves = await dbService.getAllSaves();
      // Sort by updated time desc
      saves.sort((a, b) => b.updatedAt - a.updatedAt);
      setSaveList(saves);
      setShowLoadModal(true);
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      // Directly delete without confirmation as per user request to remove all pop-up notifications
      await dbService.deleteSave(id);
      
      // Update UI List
      const newSaves = await dbService.getAllSaves();
      newSaves.sort((a, b) => b.updatedAt - a.updatedAt);
      setSaveList(newSaves);
      
      // Show Toast instead of Popup
      setToast({ show: true, message: "Đã xóa file save thành công!" });
  };

  const handleDownloadClick = (e: React.MouseEvent, save: SaveFile) => {
      e.stopPropagation();
      try {
          // Xuất toàn bộ dữ liệu WorldData (bao gồm savedState bên trong)
          const dataToExport = save.data; 
          
          // Tạo tên file theo định dạng yêu cầu: ARK_{tên_thế_giới}_{tên_nhân_vật_chính}_{timestamp}.json
          const worldName = save.data?.world?.worldName?.replace(/\s+/g, '_') || 'unknown_world';
          const playerName = save.data?.player?.name?.replace(/\s+/g, '_') || 'unknown_player';
          const timestamp = Date.now();
          const fileName = `ARK_${worldName}_${playerName}_${timestamp}.json`;
          
          const jsonStr = JSON.stringify(dataToExport, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.href = url;
          downloadAnchorNode.setAttribute("download", fileName);
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          URL.revokeObjectURL(url);

          setToast({ show: true, message: "Đã tải xuống file save!" });
      } catch (err) {
          console.error("Download error:", err);
      }
  };

  const handleResetDatabase = async () => {
    await dbService.clearAllSaves();
    setSaveList([]);
    setToast({ show: true, message: "Đã xóa toàn bộ dữ liệu!" });
  };

  const handleLoadSave = (save: SaveFile) => {
      if (!onGameStart) return;

      // save.data is fully compliant with WorldData structure including savedState
      const worldData = save.data as WorldData;
      
      // Safety check just in case savedState is missing in older saves (unlikely given new structure but safe)
      if (!worldData.savedState) {
          return;
      }

      // Track the loaded SaveFile's ID on worldData
      worldData.activeSaveId = save.id;

      onGameStart(worldData);
  };

  const handleContinue = async () => {
      const saves = await dbService.getAllSaves();
      if (saves.length > 0) {
          saves.sort((a, b) => b.updatedAt - a.updatedAt);
          handleLoadSave(saves[0]);
      }
  };

  const renderSaveItem = (save: SaveFile) => {
      const turnCount = save.data?.savedState?.turnCount || 0;
      const playerName = save.data?.player?.name;

  return (
          <div key={save.id} className="p-4 bg-white/5 border border-white/10 rounded-xl mb-3 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors" onClick={() => handleLoadSave(save)}>
              <div className="flex flex-col">
                  <span className="text-white font-bold">{save.data?.world?.worldName || 'Unknown World'}</span>
                  <span className="text-white/50 text-xs">Player: {playerName} | Turns: {turnCount}</span>
                  <span className="text-white/30 text-[10px] mt-1">{new Date(save.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={(e) => handleDownloadClick(e, save)} className="p-2 bg-sky-500/20 text-sky-400 rounded-lg"><DownloadCloud size={16} /></button>
                  <button onClick={(e) => handleDeleteClick(e, save.id)} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><Trash2 size={16} /></button>
              </div>
          </div>
      );
  };
  return (
    <div className="flex relative h-full w-full overflow-hidden bg-black text-white">
      {/* Menu Background */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-black">
        {bgImage && !bgImage.includes('ark_logo') ? (
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.35)'
            }}
          />
        ) : (
          <AnimatedBackground />
        )}
      </div>

      {/* Intro Overlay */}
      <AnimatePresence>
        {isIntroing && (
           <motion.div 
             className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-colors duration-500"
             initial={{ opacity: 1 }}
             exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
           >
             <motion.div 
               initial={{ scale: 0.85, opacity: 0, y: 15 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 1.05, opacity: 0, y: -15 }}
               transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
               className="flex flex-col items-center justify-center gap-7"
             >
               <motion.div 
                 layoutId="ark-main-logo" 
                 className="text-white"
                 animate={{ y: [0, -4, 0] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
               >
                 <ArkLogo size={140} />
               </motion.div>
               <h2 className="font-serif text-sm font-extrabold text-white/80 tracking-[0.4em] select-none uppercase">
                 LOADING...
               </h2>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        multiple
        className="hidden" 
      />

      {/* Main Layout Area */}
      <div className={`relative z-10 w-full md:w-[600px] h-full flex flex-col p-6 md:p-8 transition-opacity duration-1000 ${isIntroing ? 'opacity-0' : 'opacity-100'} overflow-y-auto custom-scrollbar md:mr-auto justify-start items-center md:items-start`}>
        
        {/* Soft Fading Backdrop Layer */}
        <div className="absolute inset-0 -z-10 bg-[#020617]/50 backdrop-blur-[40px] [mask-image:linear-gradient(to_right,black_50%,transparent_100%)] pointer-events-none" />

        {/* Inner Content Wrapper to keep items constrained */}
        <div className="w-full md:w-[420px] flex flex-col items-center md:items-start relative z-10">
        
        {/* Top Header */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-4 w-full">
            <div className="flex items-center gap-3">
              <ArkLogo size={42} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-[0.2em] text-white">
                ARK
              </h1>
            </div>
            <div className="mt-2 text-white/90 font-bold uppercase tracking-widest text-sm">ARK System Core</div>
            <div className="text-[10px] text-white/60 tracking-wider font-mono mt-1 w-full flex items-center justify-center md:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              CORE ONLINE - V8.0.0
            </div>
        </div>

        <div className="w-full h-px bg-white/20 my-8 shadow-[0_0_8px_rgba(255,255,255,0.3)]" />

        {/* Menu Items */}
        <div className="flex flex-col gap-2 w-full flex-1">
          {(() => {
            const menuItems = [
              { id: 'start', title: 'Khởi Tạo', icon: Play, onClick: () => onNavigate(GameState.WORLD_CREATION) },
              { id: 'continue', title: 'Tiếp Tục', icon: Clock, disabled: !hasSaves, onClick: handleContinue },
              { id: 'data', title: 'Dữ Liệu', icon: Database, onClick: handleOpenLoadGame },
              { id: 'fanfic', title: 'Đồng Nhân', icon: FileText, onClick: () => onNavigate(GameState.FANFIC) },
              { id: 'train', title: 'Train Data', icon: Upload, onClick: () => onNavigate(GameState.KNOWLEDGE_TRAIN) },
              { id: 'sillytavern', title: 'Thư Viện ST', icon: Users, onClick: () => setShowCharacterLibrary(true) },
              { id: 'schema', title: 'Bản Sơ Đồ', icon: Tags, onClick: () => onNavigate(GameState.SCHEMA_DESIGNER) },
              { id: 'settings', title: 'Cấu Hình', icon: Settings, onClick: () => onNavigate(GameState.SETTINGS) },
              { id: 'info', title: 'Thông Tin', icon: Info, onClick: () => setShowInfoModal(true) },
              { id: 'discord', title: 'Discord', icon: MessageCircle, isLink: true, href: 'https://discord.gg/sPq3Y37eR7' },
              { id: 'donate', title: 'Ủng Hộ (Donate)', icon: Heart, onClick: () => setShowDonateModal(true), isFeatured: true }
            ];

            return menuItems.map(item => {
              const IconComponent = item.icon;
              
              if (item.id === 'continue' && !hasSaves) {
                return (
                  <div key={item.id} className="group flex items-center p-3 rounded-xl opacity-40 cursor-not-allowed">
                    <IconComponent size={20} className="text-white/50 mr-4" />
                    <span className="font-bold text-sm uppercase tracking-widest text-white/50">{item.title}</span>
                  </div>
                );
              }

              if (item.isLink) {
                return (
                  <motion.a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex items-center p-3 rounded-xl transition-all duration-200 hover:bg-white/10 cursor-pointer"
                  >
                    <IconComponent size={20} className="text-white mr-4" />
                    <span className="font-bold text-sm uppercase tracking-widest text-white">{item.title}</span>
                  </motion.a>
                );
              }

              return (
                <motion.button
                  key={item.id}
                  onClick={item.onClick}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className="group flex items-center p-3 rounded-xl transition-all duration-200 hover:bg-white/10 cursor-pointer w-full text-left"
                >
                  <IconComponent size={20} className="text-white mr-4" />
                  <span className="font-bold text-sm uppercase tracking-widest text-white">{item.title}</span>
                </motion.button>
              );
            });
          })()}
        </div>

        {/* Footer info stats */}
        <div className="mt-8 pt-4 border-t border-white/20 w-full flex flex-col gap-2 opacity-60">
           <div className="flex items-center gap-3">
             <ShieldCheck size={16} className="text-white" />
             <span className="text-[10px] uppercase font-bold tracking-widest text-white break-all">{apiStatus.text}</span>
           </div>
           <div className="flex items-center gap-3">
             <HardDrive size={16} className="text-white" />
             <span className="text-[10px] uppercase font-bold tracking-widest text-white">{storageUsage}</span>
           </div>
           <div className="flex items-center gap-3">
             <Database size={16} className="text-white" />
             <span className="text-[10px] uppercase font-bold tracking-widest text-white">IndexedDB {hasSaves ? '(Active)' : ''}</span>
           </div>
        </div>

      </div>
        </div>

      

      {/* LOAD GAME MODAL */}

      <AnimatePresence>
          {showLoadModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 md:p-8">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-[#e6ebf4] dark:bg-[#0b1329] border border-[#cbd2df]/30 dark:border-[#142042]/20 w-[95vw] max-w-4xl h-[90vh] rounded-3xl shadow-[20px_20px_40px_rgba(0,0,0,0.15),-20px_-20px_40px_rgba(255,255,255,0.7)] dark:shadow-[20px_20px_40px_rgba(0,0,0,0.55),-20px_-20px_40px_rgba(255,255,255,0.02)] flex flex-col overflow-hidden backdrop-blur-xl"
                  >
                      {/* Header */}
                      <div className="p-5 border-b border-[#cbd2df]/20 dark:border-[#142042]/10 flex justify-between items-center bg-[#e6ebf4] dark:bg-[#0b1329]">
                          <div className="flex items-center gap-3">
                              {/* <- Back Icon & Large "Dữ liệu" text */}
                              <button 
                                onClick={() => setShowLoadModal(false)}
                                title="Quay lại"
                                className="w-[42px] h-[42px] rounded-2xl flex items-center justify-center bg-[#e6ebf4] dark:bg-[#0b1329] shadow-[3px_3px_6px_#cbd2df,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#030610,-3px_-3px_6px_#142042] active:shadow-[inset_2px_2px_4px_#cbd2df,inset_-2px_-2px_4px_#ffffff] dark:active:shadow-[inset_2px_2px_4px_#030610,inset_-2px_-2px_4px_#142042] border border-[#cbd2df]/10 dark:border-[#142042]/5 text-slate-600 dark:text-slate-400 hover:text-mystic-accent transition-all cursor-pointer hover:scale-105"
                              >
                                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                              </button>
                              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans ml-1">
                                  Dữ liệu
                              </h2>
                          </div>
                          
                          <div className="flex items-center gap-3">
                              {/* Top bên phải: Icon nhập file */}
                              <button 
                                onClick={handleImportClick}
                                title="Nhập dữ liệu (.txt)"
                                className="w-[42px] h-[42px] rounded-2xl flex items-center justify-center bg-[#e6ebf4] dark:bg-[#0b1329] shadow-[3px_3px_6px_#cbd2df,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#030610,-3px_-3px_6px_#142042] active:shadow-[inset_2px_2px_4px_#cbd2df,inset_-2px_-2px_4px_#ffffff] dark:active:shadow-[inset_2px_2px_4px_#030610,inset_-2px_-2px_4px_#142042] border border-[#cbd2df]/10 dark:border-[#142042]/5 text-emerald-600 dark:text-emerald-400 hover:scale-105 transition-transform cursor-pointer"
                              >
                                  <Upload size={18} className="stroke-[2.5]" />
                              </button>
                              
                              {/* Top bên phải: Icon reset */}
                              <button 
                                onClick={handleResetDatabase}
                                title="Khôi phục mặc định"
                                className="w-[42px] h-[42px] rounded-2xl flex items-center justify-center bg-[#e6ebf4] dark:bg-[#0b1329] shadow-[3px_3px_6px_#cbd2df,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#030610,-3px_-3px_6px_#142042] active:shadow-[inset_2px_2px_4px_#cbd2df,inset_-2px_-2px_4px_#ffffff] dark:active:shadow-[inset_2px_2px_4px_#030610,inset_-2px_-2px_4px_#142042] border border-[#cbd2df]/10 dark:border-[#142042]/5 text-red-500 hover:scale-105 transition-transform cursor-pointer"
                              >
                                  <RotateCcw size={18} className="stroke-[2.5]" />
                              </button>
                          </div>
                      </div>

                      {/* Tab Navigation */}
                      <div className="flex bg-[#e6ebf4] dark:bg-[#0b1329] p-3 gap-4 border-b border-[#cbd2df]/20 dark:border-[#142042]/10">
                          <button
                              onClick={() => setActiveSaveTab('manual')}
                              className={`flex-1 py-3 flex items-center justify-center gap-2 text-[11px] md:text-sm font-black uppercase tracking-widest transition-all rounded-xl border border-transparent cursor-pointer ${
                                  activeSaveTab === 'manual' 
                                  ? 'bg-[#e6ebf4] dark:bg-[#0b1329] shadow-[inset_3px_3px_6px_#cbd2df,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#030610,inset_-3px_-3px_6px_#142042] text-mystic-accent' 
                                  : 'bg-[#e6ebf4] dark:bg-[#0b1329] shadow-[3px_3px_6px_#cbd2df,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#030610,-3px_-3px_6px_#142042] text-slate-500 dark:text-slate-400 hover:text-mystic-accent'
                              }`}
                          >
                              <FileText size={15} className={activeSaveTab === 'manual' ? 'animate-pulse' : ''} />
                              <span>Thủ công</span>
                              <span className="ml-1.5 bg-[#cbd2df]/40 dark:bg-[#142042]/45 text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                                  {manualSaves.length}
                              </span>
                          </button>
                          <button
                              onClick={() => setActiveSaveTab('autosave')}
                              className={`flex-1 py-3 flex items-center justify-center gap-2 text-[11px] md:text-sm font-black uppercase tracking-widest transition-all rounded-xl border border-transparent cursor-pointer ${
                                  activeSaveTab === 'autosave' 
                                  ? 'bg-[#e6ebf4] dark:bg-[#0b1329] shadow-[inset_3px_3px_6px_#cbd2df,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#030610,inset_-3px_-3px_6px_#142042] text-mystic-accent' 
                                  : 'bg-[#e6ebf4] dark:bg-[#0b1329] shadow-[3px_3px_6px_#cbd2df,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#030610,-3px_-3px_6px_#142042] text-slate-500 dark:text-slate-400 hover:text-mystic-accent'
                              }`}
                          >
                              <Clock size={15} className={activeSaveTab === 'autosave' ? 'animate-pulse' : ''} />
                              <span>Tự động</span>
                              <span className="ml-1.5 bg-[#cbd2df]/40 dark:bg-[#142042]/45 text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                                  {autoSaves.length}
                              </span>
                          </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-hidden bg-[#e6ebf4] dark:bg-[#0b1329]">
                          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar lg:p-6 pb-12">
                              {(activeSaveTab === 'manual' ? manualSaves : autoSaves).length === 0 ? (
                                  <div className="text-center text-slate-400 dark:text-slate-500 py-24 text-sm font-semibold italic">
                                      Chưa có tệp lưu {activeSaveTab === 'manual' ? 'thủ công' : 'tự động'}.
                                  </div>
                              ) : (
                                  (activeSaveTab === 'manual' ? manualSaves : autoSaves).map((save) => renderSaveItem(save))
                              )}
                          </div>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <AnimatePresence>
        
        {showCharacterLibrary && (
            <CharacterLibraryScreen 
                onClose={() => setShowCharacterLibrary(false)}
                onGameStart={onGameStart}
            />
        )}
      </AnimatePresence>

      {/* Success Toast Notification */}
      <AnimatePresence>
        {toast.show && (
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-16 right-4 md:bottom-10 md:right-10 z-[100] bg-white dark:bg-mystic-800 border border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-400 px-6 py-3 rounded-lg shadow-lg dark:shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center gap-3 backdrop-blur-md"
            >
                <CheckCircle size={20} />
                <span className="font-bold text-sm">{toast.message}</span>
            </motion.div>
        )}
      </AnimatePresence>

      {/* INFO MODAL */}
      <AnimatePresence>
          {showInfoModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="bg-stone-200/90 dark:bg-mystic-950/90 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
                  >
                      {/* Header */}
                      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-stone-300/60 dark:bg-mystic-900/40">
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-widest">
                              <Info size={18} className="text-mystic-accent" /> Thông tin
                          </h2>
                          <button onClick={() => setShowInfoModal(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 transition-colors">
                              <X size={20} />
                          </button>
                      </div>

                      {/* Tabs Bar */}
                      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-stone-300/30 dark:bg-mystic-900/20 text-xs font-mono">
                          <button
                            onClick={() => setInfoActiveTab('info')}
                            className={`flex-1 py-3 text-center font-bold uppercase tracking-wider border-b-2 transition-all ${
                              infoActiveTab === 'info'
                                ? "border-mystic-accent text-mystic-accent dark:text-white"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                              Thông Tin
                          </button>
                          <button
                            onClick={() => setInfoActiveTab('changelog')}
                            className={`flex-1 py-3 text-center font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                              infoActiveTab === 'changelog'
                                ? "border-mystic-accent text-mystic-accent dark:text-white"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                              <Clock size={12} /> Lịch Sử Cập Nhật
                          </button>
                      </div>

                      {/* Content */}
                      <div className="p-6 md:p-8 text-slate-700 dark:text-slate-300 font-sans leading-relaxed min-h-[300px] flex flex-col justify-start">
                          {infoActiveTab === 'info' ? (
                              <div className="space-y-6">
                                  <div className="text-center pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
                                      <h3 className="font-serif text-3xl font-black tracking-wider text-slate-900 dark:text-white drop-shadow-xl">
                                          ARK Rebuild
                                      </h3>
                                      <p className="text-xs text-mystic-accent uppercase tracking-widest font-bold mt-1">
                                          Phiên bản: v0.4.7 Alpha
                                      </p>
                                  </div>

                                  <div className="space-y-4">
                                      <div className="flex justify-between items-start gap-4">
                                          <div>
                                              <h4 className="text-xs uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                                                  Phát triển & Làm mới toàn diện bởi
                                              </h4>
                                              <p className="font-semibold text-slate-850 dark:text-slate-100 text-sm tracking-wide">
                                                  Bạch Phát Dược Thiên Tôn
                                              </p>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setShowInfoModal(false);
                                              setShowDonateModal(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                                          >
                                              <Heart size={10} fill="currentColor" className="animate-pulse" />
                                              Ủng Hộ
                                          </button>
                                      </div>

                                      <div>
                                          <h4 className="text-xs uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                                              Credits
                                          </h4>
                                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                              Ứng dụng này là một bản rebuild. Dự án ARK Rebuild gốc vốn được kế thừa và phát triển từ ARK V2 (bởi tác giả Thích Ma Đạo).
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar text-left w-full">
                                  {CHANGELOG_DATA.map((entry) => (
                                      <div key={entry.version} className="border border-slate-200 dark:border-slate-800 hover:border-mystic-accent/30 dark:hover:border-mystic-accent/25 bg-stone-300/10 dark:bg-mystic-900/10 rounded-xl p-4 transition-all text-xs">
                                          <div className="flex justify-between items-center mb-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5">
                                              <span className="font-mono text-sm font-black text-mystic-accent leading-none">
                                                  {entry.version}
                                              </span>
                                              <span className="font-mono text-[10px] text-slate-550 dark:text-slate-400">
                                                  {entry.date}
                                              </span>
                                          </div>
                                          <ul className="space-y-1.5 list-none pl-0">
                                              {entry.changes.map((change, cIdx) => (
                                                  <li key={cIdx} className="leading-relaxed text-slate-600 dark:text-slate-350 flex items-start gap-1.5 text-[11px]">
                                                      <span className="text-mystic-accent shrink-0 mt-0.5">•</span>
                                                      <span>{change}</span>
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-stone-300/30 dark:bg-mystic-900/20 flex justify-end">
                          <button 
                            onClick={() => setShowInfoModal(false)}
                            className="px-5 py-2 bg-mystic-accent text-mystic-950 hover:bg-mystic-accent/90 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            Đóng
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* DONATE MODAL */}
      <AnimatePresence>
          {showDonateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="bg-stone-200/95 dark:bg-mystic-950/95 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
                  >
                      {/* Header */}
                      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-stone-300/60 dark:bg-mystic-900/40">
                          <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 uppercase tracking-widest">
                              <Heart size={18} fill="currentColor" className="text-rose-500 animate-pulse" /> Ủng hộ dự án
                          </h2>
                          <button onClick={() => setShowDonateModal(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 transition-colors">
                              <X size={20} />
                          </button>
                      </div>

                      {/* Content */}
                      <div className="p-6 md:p-8 space-y-6 text-slate-700 dark:text-slate-300 font-sans leading-relaxed overflow-y-auto max-h-[70vh] custom-scrollbar">
                          <div className="text-center">
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-4">
                                  Để đồng hành và tiếp thêm động lực cho <strong className="text-slate-900 dark:text-white font-bold">Bạch Phát Dược Thiên Tôn</strong> nâng cấp dự án <strong className="text-mystic-accent font-bold">ARK V6</strong> ngày càng vượt trội!
                              </p>
                              
                              {/* QR Image Display */}
                              <div className="flex justify-center py-2">
                                  <div className="p-3 bg-white hover:scale-[1.02] active:scale-95 transition-all outline outline-offset-4 outline-1 outline-rose-500/25 rounded-2xl inline-block shadow-lg">
                                      <img 
                                          src="/zlp-1779461952269.jpg" 
                                          alt="Quét mã ZaloPay để Donate" 
                                          className="w-56 h-auto rounded-xl object-contain mx-auto block"
                                          referrerPolicy="no-referrer"
                                      />
                                  </div>
                              </div>
                              
                              <p className="text-[10px] text-rose-500 uppercase tracking-widest font-black mt-4 animate-pulse">
                                  Quét Mã ZaloPay Để Ủng Hộ
                              </p>
                          </div>

                          <div className="text-xs bg-slate-100 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-2">
                              <div className="flex justify-between items-center">
                                  <span className="text-slate-400">Ứng dụng:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">ZaloPay</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-slate-400">Tác giả:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">Bạch Phát Dược Thiên Tôn</span>
                              </div>
                              <div className="text-slate-400 text-[10px] py-2 leading-normal border-t border-slate-200/50 dark:border-slate-800/50 mt-1">
                                  * Lưu ý: Mọi sự ủng hộ (donate) đều hoàn toàn tự nguyện nhằm duy trì chi phí phát triển và cập nhật ứng dụng. Xin chân thành cảm ơn!
                              </div>
                          </div>
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-stone-300/30 dark:bg-mystic-900/20 flex justify-end">
                          <button 
                            onClick={() => setShowDonateModal(false)}
                            className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
                          >
                            Đóng
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default MainMenuScreen;
