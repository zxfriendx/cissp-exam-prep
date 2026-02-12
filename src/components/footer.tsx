export function Footer() {
    return (
        <footer className="border-t border-primary/10 bg-background py-8 md:py-10 mt-20">
            <div className="container flex flex-col items-center justify-between gap-6 md:flex-row mx-auto max-w-7xl px-6 sm:px-10">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    Built by{" "}
                    <a
                        href="https://github.com/zxfriendx"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-secondary hover:text-primary transition-colors underline-offset-4"
                    >
                        zxfriendx
                    </a>
                </p>
                <p className="text-center text-xs text-muted-foreground md:text-right leading-relaxed max-w-md">
                    CISSP&reg; is a registered trademark of{" "}
                    <a
                        href="https://www.isc2.org/certifications/cissp"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-secondary hover:text-primary transition-colors"
                    >
                        (ISC)&sup2;
                    </a>
                    . This app is not affiliated with or endorsed by (ISC)&sup2;.
                </p>
            </div>
        </footer>
    );
}
