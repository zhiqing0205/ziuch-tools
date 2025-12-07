'use client';

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export function Navbar() {
    const { theme, setTheme } = useTheme();
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/latex-ocr') {
            return pathname === '/latex-ocr' || pathname.startsWith('/latex-ocr/');
        }
        if (path === '/pub-finder') {
            return pathname === '/pub-finder' || pathname.startsWith('/pub-finder/');
        }
        if (path === '/academic-calendar') {
            return pathname === '/academic-calendar' || pathname.startsWith('/academic-calendar/');
        }
        return pathname === path;
    };

    return (
        <div className="border-b sticky top-0 bg-background z-50">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <NavigationMenu>
                    <NavigationMenuList className="gap-6">
                        <NavigationMenuItem>
                            <Link href="/pub-finder" legacyBehavior passHref>
                                <NavigationMenuLink 
                                    className={cn(
                                        navigationMenuTriggerStyle(),
                                        "text-base font-medium",
                                        isActive('/pub-finder') ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    文献查询
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Link href="/latex-ocr" legacyBehavior passHref>
                                <NavigationMenuLink
                                    className={cn(
                                        navigationMenuTriggerStyle(),
                                        "text-base font-medium",
                                        isActive('/latex-ocr') ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    公式识别
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Link href="/academic-calendar" legacyBehavior passHref>
                                <NavigationMenuLink
                                    className={cn(
                                        navigationMenuTriggerStyle(),
                                        "text-base font-medium",
                                        isActive('/academic-calendar') ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    学术日历
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Link href="/about" legacyBehavior passHref>
                                <NavigationMenuLink 
                                    className={cn(
                                        navigationMenuTriggerStyle(),
                                        "text-base font-medium",
                                        isActive('/about') ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    关于
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    >
                        {theme === "light" ? (
                            <Moon className="h-5 w-5" />
                        ) : (
                            <Sun className="h-5 w-5" />
                        )}
                        <span className="sr-only">切换主题</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                    >
                        <a
                            href="https://github.com/zhiqing0205/ziuch-tools"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center"
                        >
                            <Github className="h-5 w-5" />
                            <span className="sr-only">GitHub</span>
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
