'use client';

import { useAuth } from '@/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/registry/new-york-v4/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/registry/new-york-v4/ui/avatar';
import { useRouter } from 'next/navigation';
import { LogOut, User, Bookmark, History, ShieldAlert } from 'lucide-react';

export function UserProfileMenu() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  
  if (!user || !userData) return null;
  
  const handleLogout = async () => {
    await logout();
  };
  
  // Get user initials for avatar fallback
  const getInitials = () => {
    if (userData.displayName) {
      return userData.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return userData.email ? userData.email[0].toUpperCase() : 'U';
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 focus:outline-none">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={userData.photoURL || undefined} alt={userData.displayName || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData.displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{userData.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/profile/bookmarks')}>
          <Bookmark className="mr-2 h-4 w-4" />
          <span>Bookmarks</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/profile/history')}>
          <History className="mr-2 h-4 w-4" />
          <span>History</span>
        </DropdownMenuItem>
        
        {userData?.isAdmin && (
          <DropdownMenuItem onClick={() => router.push('/admin/dashboard')} className="text-primary">
            <ShieldAlert className="mr-2 h-4 w-4 text-primary" />
            <span className="font-medium">Admin Dashboard</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 