'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface BackLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function BackLink({ href, children, className = '' }: BackLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Add exit animation to the current page
    document.documentElement.classList.add('page-exit');
    
    // Navigate after a short delay
    setTimeout(() => {
      router.push(href);
    }, 300); // Match the transition duration in globals.css
  };

  return (
    <motion.div
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.98 }}
      className="inline-block"
    >
      <Link 
        href={href} 
        onClick={handleClick}
        className={`flex items-center text-primary hover:text-primary/80 font-medium ${className}`}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {children}
      </Link>
    </motion.div>
  );
} 