import './style.css';
import Container from '../container';
import logo from '../../assets/logo.png';


const Loading = () => {
  return (
    <Container className='loading-screen'>
        <img src={logo} alt='docshare' className='loading-logo' />
    </Container>
  )
}

export default Loading