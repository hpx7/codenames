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
        width: "125px",
        height: "75px",
        lineHeight: "75px",
        textAlign: "center",
        cursor: "pointer",
        border: card.selectedBy != undefined ? "5px solid purple" : "5px solid " + this.getColor(card),
        backgroundColor: this.getColor(card),
      })}
      @click="${() =>
        this.client.selectCard({ word: card.word }, (error) => {
          if (error) {
            this.dispatchEvent(new CustomEvent("error", { detail: error }));
          }
        })}"
    >
      ${card.word}
    </div>`;
  }

  getColor(card: Card){
    return card.color != undefined ? Color[card.color].toLowerCase() : "grey";
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
      }
    `;
  }
}
