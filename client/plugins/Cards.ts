import { LitElement, css, html, property } from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { Card, Cards, Color } from "../.rtag/types";
import { RtagClient } from "../.rtag/client";

export default class CardsComponent extends LitElement {
  @property() val!: Cards;
  @property() client!: RtagClient;

  render() {
    return html`<div class="grid-container">${this.val.map((card) => this.renderCard(card))}</div>`;
  }

  renderCard(card: Card) {
    return html`<div
      class="grid-item"
      style=${styleMap({
        outline: "3px solid " + (isSelected(card) ? Color[card.selectedBy!].toLowerCase() : getCardColor(card)),
        border: "5px solid " + (isSelected(card) ? "black" : getCardColor(card)),
        backgroundColor: getCardColor(card),
      })}
      @click="${async () => {
        const res = await this.client.selectCard({ word: card.word });
        if (res.type === "error") {
          this.dispatchEvent(new CustomEvent("error", { detail: res.error }));
        }
      }}"
    >
      ${card.word}
    </div>`;
  }

  static get styles() {
    return css`
      .grid-container {
        display: grid;
        grid-template-columns: auto auto auto auto auto;
      }
      .grid-item {
        margin: 10px;
        font-weight: 900;
        width: 115px;
        height: 65px;
        lineHeight: 75px;
        textAlign: center;
        cursor: pointer;
      }
    `;
  }
}

function getCardColor(card: Card) {
  return card.color !== undefined && card.color !== null ? Color[card.color].toLowerCase() : "grey";
}

function isSelected(card: Card) {
  return card.selectedBy !== undefined && card.selectedBy !== null;
}
