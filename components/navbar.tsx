'use client';

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                                            <Link href="/">主页</Link>
                                        </NavigationMenuLink>
                                    </li>
                                    <li>
                                        <NavigationMenuLink
                                            asChild
                                            className={navigationMenuTriggerStyle()}
                                        >
                                            <Link href="/history">历史记录</Link>
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
                                            <Link href="/">主页</Link>
                                        </NavigationMenuLink>
                                    </li>
                                    <li>
                                        <NavigationMenuLink
                                            asChild
                                            className={navigationMenuTriggerStyle()}
                                        >
                                            <Link href="/history">历史记录</Link>
                                        </NavigationMenuLink>
                                    </li>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">切换主题</span>
                </Button>
            </div>
        </div>
    );
}
