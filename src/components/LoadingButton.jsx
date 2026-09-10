export default function LoadingButton({ loading = false, disabled = false, loadingText, children, className = '', ...props }) {
  return (
    <button
      className={`${className}${loading ? ' is-loading' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}