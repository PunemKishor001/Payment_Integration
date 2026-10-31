import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import 'regenerator-runtime/runtime';
import { InventoryData } from '../data/inventory-data.js';
import { Credentials } from './credentials.js';
import { ShoppingCart } from './shopping-cart.js';

const RAZORPAY_BACKEND_URL = 'http://localhost:5000';

class SummaryItem extends Component {

    constructor(props) {
      super(props);

      this.item = props.item;
      this.state = {
          itemVisible: true
      }
      
      if (props.item == null) {
        // Hide this if the item is invalid
        this.state.itemVisible = false;
      }
    }

    render () {
      
      if (this.state.itemVisible) {
        var linkId = this.item.id;
        if (Credentials.isProblemUser()) {
          linkId += 1; 
        }
        var itemLink = `./inventory-item.html?id=${linkId}`;
        
        return (
            <div class="cart_item">
              <div class="summary_quantity">1</div>
              <div class="cart_item_label">
                <a href={itemLink} id={`item_${this.item.id}_title_link`}>
                  <div class="inventory_item_name">{this.item.name}</div>
                </a>
                <div class="inventory_item_desc">{this.item.desc}</div>
                <div class="inventory_item_price">${this.item.price}</div>
              </div>
            </div>
        );
      } else {
        return ( <div class="removed_cart_item"/> );
      }
    }
  }

  class CheckoutSummary extends Component {
    constructor(props) {
      super(props);
      this.removeUnavailableItems = this.removeUnavailableItems.bind(this);
    }

    clearCart() {
      // No cart clear on order complete for the problem user
      if (!Credentials.isProblemUser()) {
        // Wipe out our shopping cart
        ShoppingCart.resetCart();
      }
    }

    removeUnavailableItems() {
      const contents = ShoppingCart.getCartContents();
      const validContents = contents.filter(itemId =>
        Number.isInteger(itemId) && itemId >= 0 && itemId < InventoryData.ITEMS.length
      );
      ShoppingCart.setCartContents(validContents);
      this.forceUpdate();
    }
    
    async startRazorpayPayment(amountPaise) {
      const status = document.getElementById('razorpay-payment-status');
      const button = document.getElementById('razorpay-pay-button');
      try {
        status.textContent = 'Creating secure test order...';
        button.disabled = true;
        const orderRes = await fetch(`${RAZORPAY_BACKEND_URL}/createOrder`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `sauce_${Date.now()}` })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData.success) throw new Error(orderData.message || 'Order creation failed');
        const keyRes = await fetch(`${RAZORPAY_BACKEND_URL}/razorpay-key`);
        const keyData = await keyRes.json();
        if (!keyRes.ok || !keyData.key) throw new Error('Razorpay test key is not configured');
        const checkout = new window.Razorpay({
          key: keyData.key, amount: orderData.order.amount, currency: orderData.order.currency,
          name: 'Swag Labs QA Demo', description: 'SauceDemo cart checkout', order_id: orderData.order.id,
          handler: async (response) => {
            try {
              const verifyRes = await fetch(`${RAZORPAY_BACKEND_URL}/verifyOrder`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature })
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                status.textContent = 'Payment verification failed; order not confirmed.';
                button.disabled = false; return;
              }
              sessionStorage.setItem('razorpayVerifiedOrder', JSON.stringify({
                orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, verified: true
              }));
              window.location.href = './checkout-complete.html?payment=razorpay';
            } catch (e) { status.textContent = `Verification error: ${e.message}`; button.disabled = false; }
          },
          modal: { ondismiss: () => { status.textContent = 'Checkout closed; payment not confirmed.'; button.disabled = false; } }
        });
        checkout.on('payment.failed', () => { status.textContent = 'Payment failed. You can retry.'; button.disabled = false; });
        checkout.open();
        status.textContent = 'Razorpay Checkout opened.';
      } catch (e) { status.textContent = `Unable to start payment: ${e.message}`; button.disabled = false; }
    }

    render () {
      
      var contents = ShoppingCart.getCartContents();
      var items = contents.map(itemId =>
        Number.isInteger(itemId) && itemId >= 0 ? InventoryData.ITEMS[itemId] : undefined
      );
      var hasUnavailableItems = items.some(item => item == null);
      var orderTotal = 0;
      
      for (var curItem in items) {
        if (items[curItem] == null) {
          continue;
        }
        orderTotal = orderTotal + items[curItem].price;
        if (Credentials.isProblemUser()) {
          // double up for the problem user
          orderTotal = orderTotal + items[curItem].price;
        }
      }

      var orderTax = (orderTotal * 0.08).toFixed(2);
      
      return (
        <div>
          <div class="cart_list">
            <div class="cart_quantity_label">QTY</div>
            <div class="cart_desc_label">DESCRIPTION</div>
            {items.map((item, i) => {
              return item
                ? <SummaryItem key={contents[i]} item={item} />
                : <div className="removed_cart_item" key={`unavailable-${i}`}>Item unavailable</div>;
            })}
          </div>
          <div class="summary_info">
            <div class="summary_info_label">Payment Information:</div>
            <div class="summary_value_label">SauceCard #31337</div>
            <div class="summary_info_label">Shipping Information:</div>
            <div class="summary_value_label">FREE PONY EXPRESS DELIVERY!</div>
            <div class="summary_subtotal_label">Item total: ${orderTotal}</div>
            <div class="summary_tax_label">Tax: ${orderTax}</div>
            <div class="summary_total_label">Total: ${(orderTotal + parseFloat(orderTax)).toFixed(2)}</div>
            <div className="cart_footer">
              {hasUnavailableItems && <div role="alert">
                Some cart items are unavailable. Remove them before continuing to payment.
                <button type="button" onClick={this.removeUnavailableItems}>REMOVE UNAVAILABLE ITEMS</button>
              </div>}
              <a className="cart_cancel_link btn_secondary" href="./inventory.html">CANCEL</a>
              <button type="button" className="btn_action cart_button" id="razorpay-pay-button"
                disabled={hasUnavailableItems || contents.length === 0}
                onClick={() => this.startRazorpayPayment(Math.round((orderTotal + parseFloat(orderTax)) * 100))}>
                PAY WITH RAZORPAY
              </button>
              <p id="razorpay-payment-status" role="status" aria-live="polite"></p>
            </div>
          </div>
        </div>
      );
    }
  }

export default CheckoutSummary;

const domContainer = document.getElementById('checkout_summary_container');
domContainer ? ReactDOM.render(<CheckoutSummary />, domContainer) : false;