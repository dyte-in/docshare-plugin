import Icon from '../icon';
import Loader from '../loader';
import './style.css'

type Variant = 'loading' | 'default';

interface Props {
    label: string;
    size: number;
    variant?: Variant;
    onDelete?: () => void;
    onClick?: () => void;
}

const File = (props: Props) => {
    const { label, size, variant, onDelete, onClick } = props;
    const formatSize = (val: number) => {
        let ext = 'KB';
        let s = size / 1000;
        if (s > 100) {
            s = s / 1000;
            ext = 'MB'
        }
        return `${s.toFixed(2)} ${ext}`
    }
  return (
    <div className='file'>
        <div className='file-grow' onClick={onClick}>
            <Icon className='file-icon' icon='file' />
            <div className='file-info'>
                <div className='file-label'>{label}</div>
                <div className='file-size'>{formatSize(size)}</div>
            </div>
        </div>
        {
            variant === 'loading' ? (
               <Loader />
            ) : <Icon className='file-cta-icon' icon='delete' onClick={onDelete} />
        }
    </div>
  )
}

export default File

File.defaultProps = {
    variant: 'default',
    onDelete: () => {},
    onClick: () => {},
};
