
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>
          © {new Date().getFullYear()} Marginal — Local Docker Compose Deployment
        </span>
        <span>
          Built with React · Node.js · MySQL · Docker
        </span>
      </div>
    </footer>
  );
}
