import { errorCodes } from '../../utils/constants';
import Icon from '../icon';
import './style.css';

interface Props {
    onDismiss: () => void;
    code: keyof typeof errorCodes;
}

const ErrorModal = (props: Props) => {
  const { code, onDismiss } = props;
  return (
    <div className="error-container">
        <div className='error-modal'>
            <p>Error: {errorCodes[code]}</p>
            <Icon icon='dismiss' className='error-icon' onClick={onDismiss} />
        </div>
    </div>
  )
}

export default ErrorModal