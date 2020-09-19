import { LitElement, html, property } from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { Card, Color } from "../.rtag/types";
import { RtagClient } from "../.rtag/client";

export default class CardComponent extends LitElement {
  @property() val!: Card;
  @property() client!: RtagClient;

  render() {
    return html`<div
      style=${styleMap({
        width: "125px",
        height: "75px",
        lineHeight: "75px",
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: this.val.color != undefined ? Color[this.val.color].toLowerCase() : "grey",
      })}
      @click="${() =>
        this.client.selectCard({ word: this.val.word }, (error) => {
          if (error) {
            this.dispatchEvent(new CustomEvent("error", { detail: error }));
          }
        })}"
    >
      ${this.val.word}
    </div>`;
  }
}
