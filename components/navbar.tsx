'use client';

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function Navbar() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="border-b">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <NavigationMenu>
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>公式识别</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid gap-3 p-4 w-[200px]">
                                    <li>
                                        <NavigationMenuLink
                                            asChild
                                            className={navigationMenuTriggerStyle()}
                                        >
                                            <Link href="/latex-ocr">主页</Link>
                                        </NavigationMenuLink>
                                    </li>
                                    <li>
                                        <NavigationMenuLink
                                            asChild
                                            className={navigationMenuTriggerStyle()}
                                        >
                                            <Link href="/latex-ocr/history">历史记录</Link>
                                        </NavigationMenuLink>
                                    </li>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>文献查询(待实现)</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid gap-3 p-4 w-[200px]">
                                    <li>
                                        <NavigationMenuLink
                                            asChild
                                            className={navigationMenuTriggerStyle()}
                                        >
                                            <Link href="/pub-finder">文献查询</Link>
                                        </NavigationMenuLink>
                                    </li>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Link href="/about" legacyBehavior passHref>
                                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                    关于
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuLink
                                asChild
                                className={navigationMenuTriggerStyle()}
                            >
                                <Link href="https://ziuch.com" target="_blank">博客</Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
