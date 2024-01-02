import Icon from '../icon';
import './style.css';

interface Props {
    placeholder: string;
    onChange: (val: string) => void;
    disabled: boolean;
    value: string;
}

const Input = (props: Props) => {
    const { placeholder, onChange, value, disabled } = props;
  return (
    <div className={`input-container ${disabled ? 'input-disabled' : ''}`}>
        <Icon icon='search' className='input-icon' />
        <input
            className='input'
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)} 
            value={value}
            disabled={disabled}
        />
    </div>
  )
}

export default Input;

Input.defaultProps = {
}