export type AdminMessageProps = {
  message: string;
  type: "success" | "error" | "info";
  className?: string;
  style?: React.CSSProperties;
};

export default function AdminMessage({ message, type, className = "", style }: AdminMessageProps) {
  return (
    <div role="status" className={className} data-message-type={type} style={style}>
      {message}
    </div>
  );
}
