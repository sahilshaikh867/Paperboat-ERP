'use client';

import React from 'react';
import Link from 'next/link';

interface PaperboatLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  href?: string;
  className?: string;
  showSubtitle?: boolean;
}

export default function PaperboatLogo({
  size = 'md',
  variant = 'full',
  href,
  className = '',
  showSubtitle = true,
}: PaperboatLogoProps) {
  const iconSizeMap = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const titleSizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const LogoIcon = (
    <div
      className={`relative ${iconSizeMap[size]} rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300 flex items-center justify-center shrink-0`}
    >
      <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center backdrop-blur-md overflow-hidden p-1.5">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Origami Boat Left Hull */}
          <path
            d="M6 32L18 38L24 24L6 32Z"
            fill="url(#boat-grad-1)"
            className="transition-opacity duration-300"
          />
          {/* Origami Boat Right Hull */}
          <path
            d="M42 32L30 38L24 24L42 32Z"
            fill="url(#boat-grad-2)"
            className="transition-opacity duration-300"
          />
          {/* Origami Center Bottom Keel */}
          <path
            d="M18 38L24 42L30 38L24 24L18 38Z"
            fill="url(#boat-grad-3)"
          />
          {/* Origami Sail / Mast Center */}
          <path
            d="M24 6L14 26H34L24 6Z"
            fill="url(#sail-grad)"
          />
          {/* Left Sail Shadow */}
          <path
            d="M24 6L14 26H24V6Z"
            fill="#059669"
            fillOpacity="0.4"
          />
          {/* Academic Star at the Top */}
          <circle cx="24" cy="6" r="2" fill="#F59E0B" />

          {/* Linear Gradients */}
          <defs>
            <linearGradient id="boat-grad-1" x1="6" y1="24" x2="24" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="boat-grad-2" x1="42" y1="24" x2="24" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#14B8A6" />
              <stop offset="1" stopColor="#0D9488" />
            </linearGradient>
            <linearGradient id="boat-grad-3" x1="18" y1="24" x2="30" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#047857" />
              <stop offset="1" stopColor="#064E3B" />
            </linearGradient>
            <linearGradient id="sail-grad" x1="24" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );

  if (variant === 'icon') {
    if (href) {
      return (
        <Link href={href} className={`inline-flex items-center group ${className}`}>
          {LogoIcon}
        </Link>
      );
    }
    return <div className={`inline-flex items-center ${className}`}>{LogoIcon}</div>;
  }

  const Content = (
    <div className={`flex items-center gap-3 group ${className}`}>
      {LogoIcon}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight text-slate-900 dark:text-white ${titleSizeMap[size]} leading-none`}
          >
            Paper<span className="text-emerald-500 dark:text-emerald-400">boat</span>
          </span>
          {variant === 'badge' ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold uppercase">
              ERP
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold uppercase">
              EDUCATION ERP
            </span>
          )}
        </div>
        {showSubtitle && (
          <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium tracking-tight mt-0.5">
            College & University Academic Governance • <span className="text-emerald-600 dark:text-emerald-400 font-semibold">ExamForge Engine</span>
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="inline-block">{Content}</Link>;
  }

  return Content;
}

