// renderer/App.js
const { api } = window;

function App() {
  const handleAuthorize = () => {
    api.authorize();
  };

  const handleGetOrders = async () => {
    const orders = await api.getOrders();
    console.log('Orders:', orders);
  };

  return (
    <div>
      <button onClick={handleAuthorize}>Authorize</button>
      <button onClick={handleGetOrders}>Get Orders</button>
    </div>
  );
}