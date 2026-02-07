export function Footer() {
    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto max-w-7xl px-4 sm:px-8">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    Built by{" "}
                    <a
                        href="https://github.com/zxfriendx"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-4"
                    >
                        zxfriendx
                    </a>
                    .
                </p>
                <p className="text-center text-xs text-muted-foreground md:text-right">
                    CISSP&reg; is a registered trademark of{" "}
                    <a
                        href="https://www.isc2.org/certifications/cissp"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-4 hover:text-foreground transition-colors"
                    >
                        (ISC)&sup2;
                    </a>
                    . This app is not affiliated with or endorsed by (ISC)&sup2;.
                </p>
            </div>
        </footer>
    );
}
