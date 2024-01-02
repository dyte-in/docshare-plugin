import './style.css';
import Icon from '../icon';
import iconPack from '../icon/iconPack.json';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
interface Props {
    label: string;
    icon?: keyof typeof iconPack;
    iconMode: 'sm' | 'lg';
    variant: Variant;
    onClick: () => void;
    disabled?: boolean;
}

const Button = (props: Props) => {
    const { label, icon, variant, onClick, iconMode, disabled } = props;
    const handleButtonClick = () => {
      if (disabled) {
        return;
      };
      onClick()
    }
  return (
    <div className={`button ${variant} ${disabled ? 'button-disabled': ''}`} onClick={handleButtonClick}>
        <div className={`icon-${iconMode}`}>{icon && <Icon className='button-icon' icon={icon} />}</div>
        <div className='label'>{label}</div>
    </div>
  )
}

export default Button

Button.defaultProps = {
    icon: '',
    iconMode: 'lg',
    disabled: false,
}