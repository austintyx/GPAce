import { PASSWORD_RULES } from '../utils/passwordPolicy';
import './PasswordStrengthHints.css';

export default function PasswordStrengthHints({ password }) {
  return (
    <ul className="password-hints">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password || '');
        return (
          <li key={rule.key} className={met ? 'met' : ''}>
            <span className="password-hint-icon" aria-hidden="true">{met ? '✓' : '○'}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
