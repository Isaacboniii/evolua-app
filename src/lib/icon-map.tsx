'use client';
import {
  Home, Car, GraduationCap, Briefcase, Clapperboard, Cat, Heart, CreditCard, Ticket, ShoppingCart, Utensils, Shirt, Gamepad2, Gift, Building, PiggyBank, MoreHorizontal, Sun, Leaf, HelpCircle,
  Plane, Hotel, Coffee, Pizza, Beer, Phone, Wifi, BookOpen, Bus, Hospital, Stethoscope, Dumbbell, Wrench, Music, Tv, Laptop, Smartphone, Baby, Dog, Landmark,
  type LucideIcon
} from 'lucide-react';

export const iconMap: { [key: string]: LucideIcon } = {
  Home, Car, GraduationCap, Briefcase, Clapperboard, Cat, Heart, CreditCard, Ticket, ShoppingCart, Utensils, Shirt, Gamepad2, Gift, Building, PiggyBank, MoreHorizontal, Sun, Leaf, HelpCircle,
  Plane, Hotel, Coffee, Pizza, Beer, Phone, Wifi, BookOpen, Bus, Hospital, Stethoscope, Dumbbell, Wrench, Music, Tv, Laptop, Smartphone, Baby, Dog, Landmark
};

export const iconList = Object.keys(iconMap);

export const getIcon = (name?: string | null): LucideIcon => {
  if (name && name in iconMap) {
    return iconMap[name];
  }
  return HelpCircle;
};
