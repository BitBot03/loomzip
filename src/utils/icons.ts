import { 
  Database, FolderHeart, GraduationCap, LayoutList, CheckCircle2, 
  Briefcase, Heart, Wallet, Map, Home, Star 
} from 'lucide-react';

export const ICON_MAP: Record<string, any> = {
  list: LayoutList,
  graduation: GraduationCap,
  briefcase: Briefcase,
  heart: Heart,
  wallet: Wallet,
  map: Map,
  home: Home,
  star: Star,
  database: Database,
  folder: FolderHeart,
  check: CheckCircle2
};

export const ICON_OPTIONS = [
  { 
    id: 'list', name: 'List', icon: LayoutList, 
    theme: { text: 'text-zinc-200', bg: 'bg-zinc-500/20', border: 'border-zinc-500/30', activeBg: 'bg-zinc-500/20 border-zinc-500/50 shadow-[0_0_10px_rgba(113,113,122,0.1)]' } 
  },
  { 
    id: 'graduation', name: 'Education', icon: GraduationCap, 
    theme: { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', activeBg: 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' } 
  },
  { 
    id: 'briefcase', name: 'Work', icon: Briefcase, 
    theme: { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', activeBg: 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' } 
  },
  { 
    id: 'heart', name: 'Health', icon: Heart, 
    theme: { text: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30', activeBg: 'bg-rose-500/20 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.1)]' } 
  },
  { 
    id: 'wallet', name: 'Finance', icon: Wallet, 
    theme: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', activeBg: 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' } 
  },
  { 
    id: 'map', name: 'Travel', icon: Map, 
    theme: { text: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/30', activeBg: 'bg-sky-500/20 border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.1)]' } 
  },
  { 
    id: 'home', name: 'Home', icon: Home, 
    theme: { text: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30', activeBg: 'bg-violet-500/20 border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.1)]' } 
  },
  { 
    id: 'star', name: 'Favorites', icon: Star, 
    theme: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', activeBg: 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.1)]' } 
  },
];
