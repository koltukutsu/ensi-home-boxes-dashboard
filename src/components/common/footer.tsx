'use client';

import Link from 'next/link';
import { BookOpen, Search, Info, Mail, Github, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { NewsletterForm } from './newsletter-form';
import { usePathname } from 'next/navigation';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
    const showFooter = pathname !== '/ai-chat';
    
  const mainLinks = [
    { href: '/library', label: 'Library', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/ai-chat', label: 'AI Chat', icon: <Search className="h-4 w-4" /> },
    { href: '/about-us', label: 'About Us', icon: <Info className="h-4 w-4" /> },
    { href: '/submit', label: 'Submit Content', icon: <BookOpen className="h-4 w-4" /> },
  ];
  
  const legalLinks = [
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/cookie-policy', label: 'Cookie Policy' },
  ];
  
  const socialLinks = [
    { href: 'https://twitter.com/ochtarcus', label: 'Twitter', icon: <Twitter className="h-5 w-5" /> },
    { href: 'https://github.com/ochtarcus', label: 'GitHub', icon: <Github className="h-5 w-5" /> },
    { href: 'https://linkedin.com/company/ochtarcus', label: 'LinkedIn', icon: <Linkedin className="h-5 w-5" /> },
    { href: 'mailto:contact@ochtarcus.com', label: 'Email', icon: <Mail className="h-5 w-5" /> },
  ];
  if(!showFooter) return null;

  return (
    <footer className="border-t bg-background/60 backdrop-blur-sm relative z-10 mt-16">
      <div className="container mx-auto px-4 sm:px-6 md:px-32 lg:px-48 xl:px-54 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand section */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-sm">
                <span className="text-[#f5f5ee] font-bold">O</span>
              </div>
              <span className="text-xl font-bold text-primary">Ochtarcus</span>
            </Link>
            <p className="text-muted-foreground text-sm mt-2">
              Many arms, one mind. A community-driven knowledge hub where experts share valuable content.
            </p>
            <div className="flex items-center space-x-3 mt-4">
              {socialLinks.map((link) => (
                <Button 
                  key={link.href}
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
                  asChild
                >
                  <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                    {link.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>
          
          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Navigation</h3>
            <ul className="space-y-2">
              {mainLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Stay Connected</h3>
            <p className="text-muted-foreground text-sm">
              Subscribe to our newsletter for the latest updates and content
            </p>
            <NewsletterForm />
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Ochtarcus. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-2 sm:mt-0">
            Made with ❤️ for knowledge sharing
          </p>
        </div>
      </div>
    </footer>
  );
} 