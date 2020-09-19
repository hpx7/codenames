import { LitElement, css, html, property } from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { Cards, Color } from "../.rtag/types";
import { RtagClient } from "../.rtag/client";

export default class CardsComponent extends LitElement {
  @property() val!: Cards;
  @property() client!: RtagClient;

  render() {
    return html`<div class="grid-container">  ${this.val.map(item => this.renderCard(item.word, item.color))}`
  }

  renderCard(word : string, color?: Color){
    return html`<div class="grid-item"
    style=${styleMap({
      width: "125px",
      height: "75px",
      lineHeight: "75px",
      textAlign: "center",
      cursor: "pointer",
      backgroundColor: color != undefined ? Color[color].toLowerCase() : "grey",
    })}
    @click="${() =>
      this.client.selectCard({ word: word }, (error) => {
        if (error) {
          this.dispatchEvent(new CustomEvent("error", { detail: error }));
        }
      })}"
  >
    ${word}
  </div>`;
  }

  static get styles() {
    return css`
      .grid-container {
        display: grid;
        grid-template-columns: auto auto auto auto auto;
       }
      .grid-item{
        margin: 10px;
        border: 1px solid #4CAF50;
      }
    `;
  }
}
