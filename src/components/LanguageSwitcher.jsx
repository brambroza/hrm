
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const languages = [
  { 
    code: 'th', 
    label: 'ไทย', 
    flag: '🇹🇭', 
    ariaLabelKey: 'language.thaiAria' 
  },
  { 
    code: 'en', 
    label: 'English', 
    flag: '🇬🇧', 
    ariaLabelKey: 'language.englishAria' 
  }
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  
  // Safe check for current language
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex items-center gap-2 h-9 px-3 transition-all duration-200",
            "bg-white border-slate-200 text-slate-900 hover:bg-slate-100",
            "dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:hover:bg-slate-800",
            "focus:ring-2 focus:ring-emerald-500/20"
          )}
          aria-label={t('language.change')}
          aria-expanded="false" 
        >
          <span className="text-lg leading-none" role="img" aria-label={t(currentLang.ariaLabelKey)}>
            {currentLang.flag}
          </span>
          <span className="hidden sm:inline-block font-medium text-sm">
            {currentLang.label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end"
        className={cn(
          "w-[160px] p-1",
          "bg-white dark:bg-slate-900",
          "border border-slate-200 dark:border-slate-800",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
        )}
        role="listbox" 
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "flex items-center gap-3 cursor-pointer p-2.5 rounded-md transition-colors",
              i18n.language === lang.code
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            aria-label={t(lang.ariaLabelKey)}
            role="option"
            aria-selected={i18n.language === lang.code}
          >
            <span className="text-lg leading-none">{lang.flag}</span>
            <span className="text-sm">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
