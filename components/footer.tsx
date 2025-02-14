import Link from "next/link"

export function Footer() {
    return (
        <footer className="border-t">
            <div className="container mx-auto py-4">
                <div className="flex justify-center items-center space-x-1 text-sm text-muted-foreground">
                    <Link 
                        href="https://github.com/zhiqing0205/ziuch-tools" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-foreground transition-colors"
                    >
                        ziuch-tools
                    </Link>
                    <span>by</span>
                    <Link 
                        href="https://ziuch.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-foreground transition-colors"
                    >
                        ziuch
                    </Link>
                </div>
            </div>
        </footer>
    )
}
