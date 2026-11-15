import { Banknote, ShoppingCart, Flame, Wifi, MoreHorizontal } from "lucide-react";

export const CATEGORIES = [
  { id: "Loan Fee", icon: Banknote, color: "bg-blue-100 text-blue-600", border: "border-blue-200" },
  { id: "Vegetables", icon: ShoppingCart, color: "bg-emerald-100 text-emerald-600", border: "border-emerald-200" },
  { id: "Rice", icon: ShoppingCart, color: "bg-amber-100 text-amber-600", border: "border-amber-200" },
  { id: "Gas", icon: Flame, color: "bg-orange-100 text-orange-600", border: "border-orange-200" },
  { id: "WiFi (Home)", icon: Wifi, color: "bg-indigo-100 text-indigo-600", border: "border-indigo-200" },
  { id: "WiFi (Bhada)", icon: Wifi, color: "bg-purple-100 text-purple-600", border: "border-purple-200" },
  { id: "Other", icon: MoreHorizontal, color: "bg-slate-100 text-slate-600", border: "border-slate-200" },
];
