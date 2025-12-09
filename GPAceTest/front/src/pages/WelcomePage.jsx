import { Link } from "react-router-dom";
import "../pages/WelcomePage.css";

export default function WelcomePage() {
    return(
        <div className="Main App">
        <header className="App-header">
          <h1>
            GP<span className="ace-red">Ace</span>.
          </h1>
          <p>
            The ultimate GPA calculator for students.
          </p>
          <Link className="App-link" to="/login">
            Get started
          </Link>
        </header>
        </div>
    );
}