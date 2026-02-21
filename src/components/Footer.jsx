import { HiOutlineShieldCheck, HiOutlineHeart } from 'react-icons/hi2'
import './Footer.css'

const footerLinks = {
    Product: ['Features', 'Templates', 'AI Engine', 'Pricing', 'FAQ'],
    Resources: ['Submission Guide', 'Query Writing Tips', 'Genre Database', 'Formatting Standards'],
    Company: ['About Us', 'Blog', 'Careers', 'Contact'],
    Legal: ['Privacy Policy', 'Terms of Service', 'GDPR Compliance', 'Security'],
}

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <span className="footer-logo-icon">✍️</span>
                            <span className="footer-logo-text">Author Studio</span>
                            <span className="footer-logo-badge">PRO</span>
                        </div>
                        <p className="footer-tagline">
                            The complete professional author&apos;s toolkit. Format, analyse, query, publish.
                        </p>
                        <div className="footer-security">
                            <HiOutlineShieldCheck />
                            <span>End-to-end encrypted · Zero data retention · GDPR compliant</span>
                        </div>
                    </div>

                    {Object.entries(footerLinks).map(([heading, links]) => (
                        <div key={heading} className="footer-col">
                            <h4 className="footer-col-title">{heading}</h4>
                            <ul className="footer-col-links">
                                {links.map(link => (
                                    <li key={link}>
                                        <a href="#" onClick={e => e.preventDefault()}>{link}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © 2025 Author Studio Pro. All rights reserved.
                    </p>
                    <p className="footer-made-with">
                        Made with <HiOutlineHeart className="footer-heart" /> for authors everywhere
                    </p>
                </div>
            </div>
        </footer>
    )
}
