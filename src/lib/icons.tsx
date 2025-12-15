import React from 'react';
import { ShoppingCart, Utensils, Home, Car, Tv, HeartPulse, Landmark, BrainCircuit, Wallet, AreaChart, type LucideIcon } from 'lucide-react';

export const categoryIcons: { [key: string]: LucideIcon } = {
  'Income': Wallet,
  'Food': Utensils,
  'Shopping': ShoppingCart,
  'Housing': Home,
  'Transportation': Car,
  'Utilities': Landmark,
  'Entertainment': Tv,
  'Health': HeartPulse,
  'Investment': AreaChart,
  'Other': BrainCircuit,
};

export const CategoryIcon = ({ category, className }: { category: string; className?: string }) => {
  const Icon = categoryIcons[category] || BrainCircuit;
  return <Icon className={className} />;
};
