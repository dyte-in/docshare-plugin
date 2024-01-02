interface Props {
    children: React.ReactNode;
    className?: string;
}
const Container = (props: Props) => {
    const { className, children } = props;
  return (
    <div className="grid-bg">
        <div className={`fade-bg ${className}`}>
            {children}
        </div>
    </div>
  )
}

export default Container;

Container.defaultProps = {
    className: '',
};
