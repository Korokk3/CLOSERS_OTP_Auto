// ==UserScript==
// @name         Naddic Closers OTP
// @namespace    https://www.naddic.co.kr
// @version      2025-09-19
// @description  클로저스 공식 홈페이지 (나딕게임즈) OTP 자동 입력
// @author       Korokk3
// @match        https://www.naddic.co.kr/ko/web/member/login*
// @match        https://www.naddic.co.kr/ko/service/otp*
// @match        https://www.naddic.co.kr/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=naddic.co.kr
// @grant        none
// @require      https://raw.githubusercontent.com/jiangts/JS-OTP/refs/heads/master/js/sha_dev.js
// @require      https://raw.githubusercontent.com/jiangts/JS-OTP/refs/heads/master/js/jsOTP.js
// ==/UserScript==

(function() {
    'use strict';

    console.log("Naddic OTP 자동입력 스크립트가 실행되었습니다.");

    const custom_alert = window.showCustomAlert || alert;
    const vars = {
        otp: new jsOTP.totp(30, 6), // OTP 값은 30초마다 갱신, 6자리의 코드
        get key() { return localStorage.getItem(`OTP_PASS_KEY_${this.user_id}`) },
        get user_id() { return localStorage.getItem("OTP_PASS_LAST_ID") }
    }

    // 마지막으로 로그인할 때 사용한 아이디 기록
    if (document.getElementById("Login")) {
        document.getElementById("Login").addEventListener("submit", (event) => {
            localStorage.setItem("OTP_PASS_LAST_ID", document.querySelector("[name='userID']").value);
        });
    }

    // OTP 값 저장
    function set_otp(key) {
        if (location.hash != "#step-2") return; // step-1과 step-2에서 나오는 키 값이 각각 다른데 step-2에서 나오는게 실제 값
        if (!key) return; // OTP 키 값이 없는 경우 패스
        if (!vars.user_id) { // 아이디 기록을 찾을 수 없는 경우 수동 입력
            while (!vars.user_id || vars.user_id.length < 7) {
                let user_id = prompt("아이디를 찾을 수 없습니다.\n현재 로그인 중인 나딕게임즈ID (이메일)을 입력해주세요.");
                if (user_id) localStorage.setItem("OTP_PASS_LAST_ID", user_id);
            }
        }

        localStorage.setItem(`OTP_PASS_KEY_${vars.user_id}`, key);
        custom_alert(`현재 로그인 중인 계정의 OTP 인증 키가 ${key}(으)로 설정되었습니다.`);
    }

    // DOM 감시
    const observer = new MutationObserver(function(ml, ob) {
        for (const m of ml){
            // 로그인 OTP 값 자동 입력 및 로그인 버튼 자동 클릭
            if (m.target.id === "otpWrap") {
                if (m.attributeName === "style" && m.target.style.display !== "none" && vars.key) {
                    let v = vars.otp.getOtp(vars.key, new Date().getTime());
                    document.getElementById("validCode").value = v;
                    submitOtpValidation();
                }
            }
            // OTP 값 재확인 자동 입력
            else if (m.target.id === "step-3") {
                if (m.attributeName === "style" && m.target.style.display === "block" && vars.key) {
                    let v = vars.otp.getOtp(vars.key, new Date().getTime());
                    document.getElementById("validCode").value = v;
                    document.getElementById("validCode").type = "";
                }
            }
            // OTP 생성시 키 값 확인 및 저장
            else {
                if (m.type === "characterData" && m.target.textContent) {
                    console.log("OTP 코드를 발견했습니다. (Case 1)")
                    set_otp(m.target.textContent, vars.user_id);
                } else if (m.type == "childList" && m.target.innerText) {
                    console.log("OTP 코드를 발견했습니다. (Case 2)")
                    set_otp(m.target.textContent, vars.user_id);
                }
            }
        }
    });


    // validCode 자동 채우기
    if (document.getElementById("validCode") && vars.key) {
        let v = vars.otp.getOtp(vars.key, new Date().getTime());
        document.getElementById("validCode").value = v;
        document.getElementById("validCode").type = "";
    }

    // 자동으로 채워진 validCode의 값을 필요시 추가로 업데이트 (최신화)
    // otpWrap (로그인창 OTP 입력) 객체가 발견되면 속성값 변화 감시
    if (document.getElementById("otpWrap"))
        observer.observe(document.getElementById("otpWrap"), { attributes: true});

    // step-3 (OTP 설정시 확인 입력) 객체가 발견되면 속성값 변화 감시
    if (document.getElementById("step-3"))
        observer.observe(document.getElementById("step-3"), { attributes: true});

    // secKey (OTP 설정창 키 정보) 객체가 발견되면 속성 및 자녀 속성 변화 감시
    if (document.getElementsByClassName("secKey").length > 0) {
        observer.observe(document.getElementsByClassName("secKey")[0].children[0], {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        });
    }
})();
